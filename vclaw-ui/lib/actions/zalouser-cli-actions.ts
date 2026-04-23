"use server";

import { randomUUID } from "node:crypto";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { stat } from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { resolveZalouserCliQrFilePathForServer } from "@/lib/zalouser/openclaw-zalouser-cli-qr-path";
import {
  extractZalouserIdentityFromChannelsStatusPayload,
  mapDirectorySelfPayload,
  normalizeDirectoryGroupsListPayload,
  runGatewayWsRpc,
} from "@/lib/openclaw/gateway-ws-rpc-server";

const execAsync = promisify(exec);

function isOpenclawZalouserDebug() {
  return process.env.OPENCLAW_ZALOUSER_DEBUG?.trim() === "1";
}

function getCliCommand() {
  return (process.env.OPENCLAW_CLI ?? "openclaw").trim() || "openclaw";
}

/** Fallback CLI khi Gateway WS không gọi được (`directory.self`). */
async function fetchDirectorySelfViaCli(): Promise<Record<string, unknown> | null> {
  const cli = getCliCommand();
  const cmd = `${cli} directory self --channel zalouser --json`;
  console.log(`[Zalo CLI] Executing (fallback): ${cmd}`);

  const { stdout, stderr } = await execAsync(cmd);
  console.log(`[Zalo CLI] Output (stdout):\n${stdout.trim()}`);
  if (stderr) console.log(`[Zalo CLI] Lỗi thực thi lệnh (stderr):\n${stderr.trim()}`);

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(stdout) as Record<string, unknown>;
  } catch (e) {
    if (stdout.includes("Login successful.") || (stderr && stderr.includes("Login successful."))) {
      console.log(`[Zalo CLI] Đăng nhập thành công (text), đang lấy lại thông tin định danh...`);
      const retry = await execAsync(cmd);
      data = JSON.parse(retry.stdout) as Record<string, unknown>;
    } else {
      throw e;
    }
  }
  return data;
}

export async function syncZalouserStatus() {
  try {
    let row: ReturnType<typeof mapDirectorySelfPayload> = null;
    try {
      try {
        const payload = await runGatewayWsRpc<unknown>({
          method: "directory.self",
          params: { channel: "zalouser" },
          timeoutMs: 25_000,
        });
        row = mapDirectorySelfPayload(payload);
        if (row) console.log("[Zalo Gateway WS] directory.self OK");
      } catch (eDir) {
        const mDir = String(eDir instanceof Error ? eDir.message : eDir);
        if (mDir.includes("unknown method") && mDir.includes("directory.self")) {
          const st = await runGatewayWsRpc<unknown>({
            method: "channels.status",
            params: { probe: true, timeoutMs: 20_000 },
          });
          row = extractZalouserIdentityFromChannelsStatusPayload(st);
          if (row) console.log("[Zalo Gateway WS] channels.status (probe) → zalouser identity");
        } else {
          throw eDir;
        }
      }
    } catch (wsErr) {
      console.warn("[Zalo Gateway WS] lỗi, dùng CLI fallback:", wsErr);
      const data = await fetchDirectorySelfViaCli();
      row = mapDirectorySelfPayload(data);
    }

    let displayName = "Zalo User";
    let isLinked = false;
    let avatarUrl: string | null = null;
    let accountId: string | null = null;

    if (row) {
      displayName = row.name || "Zalo User";
      avatarUrl = row.avatarUrl;
      accountId = row.id;
      isLinked = true;
    }
    
    if (isLinked) {
      await (prisma as any).integrationAccount.upsert({
        where: { provider: "zalouser" },
        update: { displayName, avatarUrl, accountId, connectedAt: new Date() },
        create: { provider: "zalouser", displayName, avatarUrl, accountId, connectedAt: new Date() }
      });
    } else {
      // Not linked or error parsing
      await prisma.integrationAccount.deleteMany({
        where: { provider: "zalouser" }
      });
      // Clear groups list as well on logout/disconnected
      await (prisma as any).integrationGroup.deleteMany({
        where: { provider: "zalouser" }
      });
    }
    
    return { success: true, isLinked, displayName, avatarUrl, accountId };
  } catch (error) {
    const errString = String((error as any)?.stderr || (error as any)?.message || error);
    console.log(`[Zalo CLI] Lỗi thực thi lệnh: \n${errString}`);
    
    // Treat "No saved Zalo session" as a successful "not linked" state, not a hard error
    if (errString.includes("No saved Zalo session")) {
      await prisma.integrationAccount.deleteMany({
        where: { provider: "zalouser" }
      });
      await (prisma as any).integrationGroup.deleteMany({
        where: { provider: "zalouser" }
      });
      return { success: true, isLinked: false, error: errString };
    }

    // Nếu gặp thông báo thành công trong luồng lỗi, gọi lại chính mình để lấy JSON
    if (errString.includes("Login successful.")) {
      console.log("[Zalo CLI] Đăng nhập thành công phát hiện trong log, đang tải lại...");
      return syncZalouserStatus();
    }

    // Handle waiting for QR scan as a neutral state
    const isWaiting = errString.toLowerCase().includes("still waiting for qr scan");
    if (isWaiting) {
      return { success: true, isLinked: false, isWaitingScan: true, error: `[Đang chờ quét] ${errString}` };
    }

    return { success: false, isLinked: false, error: errString };
  }
}

export async function getZalouserStateFromDb() {
  const account = await prisma.integrationAccount.findUnique({
    where: { provider: "zalouser" }
  });
  
  return {
    isLinked: !!account,
    displayName: account?.displayName || null,
    avatarUrl: account?.avatarUrl || null,
    connectedAt: account?.connectedAt || null
  };
}

/** Fallback CLI — cùng định dạng JSON như `directory.groups.list` khi có. */
async function fetchZalouserGroupsViaCli(): Promise<
  { id: string; name: string; raw?: { memberCount?: unknown } }[]
> {
  const cli = getCliCommand();
  const cmd = `${cli} directory groups list --channel zalouser --json`;
  if (isOpenclawZalouserDebug()) {
    console.log(`[Zalo CLI] Executing (groups): ${cmd}`);
  }
  const { stdout, stderr } = await execAsync(cmd);
  if (isOpenclawZalouserDebug()) {
    console.log(`[Zalo CLI] Groups output (stdout):\n${stdout.trim()}`);
    if (stderr) console.log(`[Zalo CLI] Groups stderr:\n${stderr.trim()}`);
  }
  const data = JSON.parse(stdout) as unknown;
  if (Array.isArray(data)) {
    return data as { id: string; name: string; raw?: { memberCount?: unknown } }[];
  }
  if (data && typeof data === "object" && Array.isArray((data as { groups?: unknown }).groups)) {
    return (data as { groups: { id: string; name: string; raw?: { memberCount?: unknown } }[] })
      .groups;
  }
  return [];
}

async function logoutZalouserViaCli(): Promise<void> {
  const cli = getCliCommand();
  const cmd = `${cli} channels logout --channel zalouser`;
  console.log(`[Zalo CLI] Executing (logout fallback): ${cmd}`);
  const { stdout, stderr } = await execAsync(cmd);
  console.log(`[Zalo CLI] Logout output (stdout):\n${stdout.trim()}`);
  if (stderr) console.log(`[Zalo CLI] Logout stderr:\n${stderr.trim()}`);
}

export async function logoutZalouser() {
  try {
    // `integrationAccount.accountId` là userId Zalo (từ directory/probe), **không** phải
    // OpenClaw channel accountId (vd `default`). Gửi nhầm khiến `channels.logout` không đúng tài khoản kênh.
    try {
      await runGatewayWsRpc<unknown>({
        method: "channels.logout",
        params: { channel: "zalouser" },
        timeoutMs: 30_000,
      });
      console.log("[Zalo Gateway WS] channels.logout OK");
    } catch (wsErr) {
      console.warn("[Zalo Gateway WS] channels.logout lỗi, dùng CLI fallback:", wsErr);
      await logoutZalouserViaCli();
    }

    await prisma.integrationAccount.deleteMany({
      where: { provider: "zalouser" },
    });
    await (prisma as any).integrationGroup.deleteMany({
      where: { provider: "zalouser" },
    });

    return { success: true };
  } catch (error) {
    console.error("Error logging out Zalo:", error);
    return { success: false, error: String(error) };
  }
}

export async function getZalouserGroups(forceRefresh = false) {
  try {
    // Lấy accountId hiện tại từ DB
    const currentAccount = await prisma.integrationAccount.findUnique({
      where: { provider: "zalouser" }
    });
    const currentAccountId = currentAccount?.accountId;

    if (!forceRefresh && currentAccountId) {
      const groupsFromDb = await (prisma as any).integrationGroup.findMany({
        where: { 
          provider: "zalouser",
          accountId: currentAccountId
        },
        orderBy: { updatedAt: 'desc' }
      });
      if (groupsFromDb.length > 0) {
        return { 
          success: true, 
          groups: groupsFromDb.map((g: any) => ({ 
            id: g.groupId, 
            name: g.name, 
            memberCount: g.memberCount 
          })) 
        };
      }
    }

    let groupsArray: { id: string; name: string; raw?: { memberCount?: unknown } }[] = [];
    // Gateway hiện tại thường **chưa** đăng ký `directory.groups.list` trên WS → mặc định chỉ CLI (ít log, không round-trip thừa).
    // OPENCLAW_ZALOUSER_TRY_DIRECTORY_GROUPS_WS=1 khi bạn dùng bản Gateway đã có RPC này.
    const tryDirectoryGroupsWs =
      process.env.OPENCLAW_ZALOUSER_TRY_DIRECTORY_GROUPS_WS?.trim() === "1";
    if (tryDirectoryGroupsWs) {
      try {
        const payload = await runGatewayWsRpc<unknown>({
          method: "directory.groups.list",
          params: { channel: "zalouser" },
          timeoutMs: 45_000,
        });
        groupsArray = normalizeDirectoryGroupsListPayload(payload) as typeof groupsArray;
        if (groupsArray.length > 0) {
          console.log("[Zalo Gateway WS] directory.groups.list OK");
        }
      } catch (wsErr) {
        const msg = String(wsErr instanceof Error ? wsErr.message : wsErr);
        if (msg.includes("unknown method") && msg.includes("directory.groups.list")) {
          if (isOpenclawZalouserDebug()) {
            console.log(
              "[Zalo] directory.groups.list chưa có trên Gateway — dùng CLI `directory groups list`.",
            );
          }
        } else {
          console.warn("[Zalo Gateway WS] directory.groups.list lỗi, dùng CLI fallback:", wsErr);
        }
        groupsArray = await fetchZalouserGroupsViaCli();
      }
    } else {
      groupsArray = await fetchZalouserGroupsViaCli();
    }

    if (groupsArray.length > 0) {
      for (const g of groupsArray) {
        if (g.id && g.name) {
          const mCount = g.raw?.memberCount ? parseInt(String(g.raw.memberCount)) : null;
          await (prisma as any).integrationGroup.upsert({
            where: { groupId: g.id },
            update: { 
              name: g.name,
              memberCount: mCount,
              accountId: currentAccountId, // Cập nhật chủ sở hữu mới nhất
              updatedAt: new Date()
            },
            create: {
              provider: "zalouser",
              accountId: currentAccountId,
              groupId: g.id,
              name: g.name,
              memberCount: mCount
            }
          });
        }
      }

      // Trả về dữ liệu đã được làm giàu thông tin memberCount
      const enrichedGroups = groupsArray.map(g => ({
        id: g.id,
        name: g.name,
        memberCount: g.raw?.memberCount ? parseInt(String(g.raw.memberCount)) : null
      }));
      
      return { success: true, groups: enrichedGroups };
    }
    
    return { success: true, groups: [] };
  } catch (error) {
    const errString = String((error as any)?.stderr || (error as any)?.message || error);
    console.log(`[Zalo CLI] Lỗi lấy danh sách nhóm: \n${errString}`);
    return { success: false, groups: [], error: errString };
  }
}

/** Fallback CLI khi Gateway WS `send` không dùng được. */
async function sendZalouserMessageViaCli(target: string, message: string): Promise<void> {
  const cli = getCliCommand();
  const escapedMessage = message.replace(/"/g, '\\"');
  const cmd = `${cli} message send --channel zalouser --target "${target}" --message "${escapedMessage}"`;
  if (isOpenclawZalouserDebug()) {
    console.log(`[Zalo CLI] Executing (send fallback): ${cmd}`);
  }
  const { stdout, stderr } = await execAsync(cmd);
  if (isOpenclawZalouserDebug()) {
    console.log(`[Zalo CLI] Message sent output (stdout):\n${stdout.trim()}`);
    if (stderr) console.log(`[Zalo CLI] Message sent error (stderr):\n${stderr.trim()}`);
  }
}

export async function sendZalouserMessage(target: string, message: string) {
  try {
    try {
      await runGatewayWsRpc<unknown>({
        method: "send",
        params: {
          to: target,
          message,
          channel: "zalouser",
          idempotencyKey: randomUUID(),
        },
        timeoutMs: 90_000,
      });
      if (isOpenclawZalouserDebug()) {
        console.log("[Zalo Gateway WS] send OK");
      }
    } catch (wsErr) {
      console.warn("[Zalo Gateway WS] send lỗi, dùng CLI fallback:", wsErr);
      await sendZalouserMessageViaCli(target, message);
    }

    // Sau khi gửi thành công (WS hoặc CLI), lưu vào Database
    try {
      // 1. Tìm hoặc tạo Conversation cho nhóm/người này
      const conversation = await prisma.conversation.upsert({
        where: {
          provider_externalThreadId: {
            provider: "zalouser",
            externalThreadId: target
          }
        },
        update: { updatedAt: new Date() },
        create: {
          provider: "zalouser",
          externalThreadId: target,
          title: `Zalo Group: ${target}`
        }
      });

      // 2. Lưu tin nhắn gửi đi
      await prisma.conversationMessage.create({
        data: {
          conversationId: conversation.id,
          direction: "OUT",
          body: message
        }
      });
    } catch (dbError) {
      console.error("[Zalo CLI] Lỗi lưu tin nhắn vào DB:", dbError);
      // Vẫn trả về success: true vì tin nhắn đã được CLI gửi đi thật
    }

    return { success: true };
  } catch (error) {
    const errString = String((error as any)?.stderr || (error as any)?.message || error);
    console.log(`[Zalo CLI] Lỗi khi gửi tin nhắn:\n${errString}`);
    return { success: false, error: String(error) };
  }
}

export async function getZalouserMessages(groupId: string) {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: {
        provider_externalThreadId: {
          provider: "zalouser",
          externalThreadId: groupId
        }
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 50 // Lấy 50 tin nhắn gần nhất
        }
      }
    });
    console.log({conversation});

    return {
      success: true,
      messages: conversation?.messages || []
    };
  } catch (error) {
    console.error("[Zalo CLI] Lỗi lấy lịch sử tin nhắn:", error);
    return { success: false, messages: [], error: String(error) };
  }
}

/**
 * Chuẩn bị phiên đăng nhập mới: xóa file QR CLI cũ (nếu có) + xóa bản ghi DB tích hợp.
 * Bản thân đăng nhập QR chỉ qua Gateway WebSocket (`web.login.start`) — không spawn `openclaw channels login`.
 */
export async function prepareZalouserLoginSession() {
  try {
    const resolvedPath = resolveZalouserCliQrFilePathForServer();
    if (resolvedPath) {
      const fs = await import("node:fs/promises");
      await fs.unlink(resolvedPath).catch(() => {});
    }
    await prisma.integrationAccount.deleteMany({
      where: { provider: "zalouser" },
    });
    await (prisma as any).integrationGroup.deleteMany({
      where: { provider: "zalouser" },
    });
    return { success: true as const };
  } catch (error) {
    console.error("[Zalo] prepareZalouserLoginSession:", error);
    return { success: false as const, error: String(error) };
  }
}

export async function getZalouserQrFileInfo() {
  try {
    const resolved = resolveZalouserCliQrFilePathForServer();
    if (!resolved) return null;
    const st = await stat(resolved);
    return { mtimeMs: st.mtimeMs };
  } catch {
    return null;
  }
}
