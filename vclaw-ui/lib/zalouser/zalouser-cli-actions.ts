"use server";

import { randomUUID } from "node:crypto";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { stat } from "node:fs/promises";
import { Prisma } from "@prisma/client";
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

function getOpenclawCliBinary() {
  return (process.env.OPENCLAW_CLI ?? "openclaw").trim() || "openclaw";
}

function zalouserGroupsListShellCommand(): string {
  return `${getOpenclawCliBinary()} directory groups list --channel zalouser --json`;
}

/** JSON từ CLI — cùng ý nghĩa với WS, đưa qua `normalizeDirectoryGroupsListPayload`. */
async function fetchZalouserGroupsListJsonViaCli(): Promise<unknown> {
  const cmd = zalouserGroupsListShellCommand();
  const { stdout, stderr } = await execAsync(cmd);
  if (isOpenclawZalouserDebug() && stderr?.trim()) console.log("[zalouser:groups] CLI stderr:", stderr.trim());
  return JSON.parse(stdout) as unknown;
}

const ZALOUSER_GROUP_PROVIDER = "zalouser";
/** Tránh vượt giới hạn tham số SQLite (~999); mỗi dòng ~8 cột. */
const INTEGRATION_GROUP_UPSERT_CHUNK = 100;

function memberCountFromGroupRaw(raw?: unknown): number | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const v = o.memberCount ?? o.totalMember;
  if (v === undefined || v === null) return null;
  const n = Number.parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Thay N lần `upsert` tuần tự (rất chậm khi làm mới danh sách nhóm) bằng vài lệnh bulk INSERT … ON CONFLICT.
 */
async function bulkUpsertZalouserIntegrationGroups(
  groups: { id: string; name: string; raw?: { memberCount?: unknown } }[],
  accountId: string | null,
) {
  const valid = groups.filter((g) => g.id?.trim() && g.name?.trim());
  if (valid.length === 0) return;

  const now = new Date();
  for (let offset = 0; offset < valid.length; offset += INTEGRATION_GROUP_UPSERT_CHUNK) {
    const chunk = valid.slice(offset, offset + INTEGRATION_GROUP_UPSERT_CHUNK);
    const valueRows = chunk.map((g) => {
      const mCount = memberCountFromGroupRaw(g.raw);
      return Prisma.sql`(${randomUUID()}, ${ZALOUSER_GROUP_PROVIDER}, ${accountId}, ${g.id}, ${g.name}, ${mCount}, ${now}, ${now})`;
    });
    await prisma.$executeRaw`
      INSERT INTO "IntegrationGroup" ("id", "provider", "accountId", "groupId", "name", "memberCount", "createdAt", "updatedAt")
      VALUES ${Prisma.join(valueRows)}
      ON CONFLICT("groupId") DO UPDATE SET
        "name" = excluded."name",
        "memberCount" = excluded."memberCount",
        "accountId" = excluded."accountId",
        "updatedAt" = excluded."updatedAt"
    `;
  }
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
      console.warn("[Zalo Gateway WS] Không lấy được trạng thái kênh:", wsErr);
      throw wsErr;
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
    const errString = String(error instanceof Error ? error.message : error);
    console.warn("[Zalo] syncZalouserStatus:", errString);
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

export async function logoutZalouser() {
  try {
    try {
      await runGatewayWsRpc<unknown>({
        method: "channels.logout",
        params: { channel: "zalouser" },
        timeoutMs: 30_000,
      });
      console.log("[Zalo Gateway WS] channels.logout OK");
    } catch (wsErr) {
      console.warn("[Zalo Gateway WS] channels.logout lỗi (tiếp tục xóa DB cục bộ):", wsErr);
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

/** Cache nhóm đã lưu (SQLite). */
async function loadZalouserGroupsFromDb(accountId: string | null | undefined) {
  const where =
    accountId != null && accountId !== ""
      ? { provider: ZALOUSER_GROUP_PROVIDER, accountId }
      : { provider: ZALOUSER_GROUP_PROVIDER };
  return prisma.integrationGroup.findMany({
    where,
    orderBy: { updatedAt: "desc" },
  });
}

/** DB cache → WS `directory.groups.list` → lỗi thì CLI `directory groups list --json` → bulkUpsert / fallback cache. */
export async function getZalouserGroups(forceRefresh = false) {
  const log = "[zalouser:groups]";
  const tick = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
  const t0 = tick();
  const elapsed = () => Math.round(tick() - t0);

  try {
    const currentAccount = await prisma.integrationAccount.findUnique({
      where: { provider: "zalouser" },
    });
    const currentAccountId = currentAccount?.accountId ?? null;

    const cached = await loadZalouserGroupsFromDb(currentAccountId ?? undefined);
    const tDb = elapsed();
    const cachedUi = cached.map((g) => ({
      id: g.groupId,
      name: g.name,
      memberCount: g.memberCount,
    }));

    if (!forceRefresh && cachedUi.length > 0) {
      if (isOpenclawZalouserDebug()) {
        console.info(`${log} cache n=${cachedUi.length} ${elapsed()}ms`);
      }
      return { success: true, groups: cachedUi };
    }

    type Row = { id: string; name: string; raw?: { memberCount?: unknown } };
    let groupsArray: Row[] = [];
    let src: "ws" | "cli" = "ws";
    const tBeforeNet = tick();
    try {
      const payload = await runGatewayWsRpc<unknown>({
        method: "directory.groups.list",
        params: { channel: "zalouser" },
        timeoutMs: 45_000,
      });
      groupsArray = normalizeDirectoryGroupsListPayload(payload) as Row[];
    } catch (wsErr) {
      const wsMsg = wsErr instanceof Error ? wsErr.message : String(wsErr);
      if (!(wsMsg.includes("unknown method") && wsMsg.includes("directory.groups"))) {
        console.warn(`${log} ws: ${wsMsg}`);
      }
      src = "cli";
      try {
        const cliJson = await fetchZalouserGroupsListJsonViaCli();
        groupsArray = normalizeDirectoryGroupsListPayload(cliJson) as Row[];
      } catch (cliErr) {
        const m = cliErr instanceof Error ? cliErr.message : String(cliErr);
        console.warn(`${log} cli: ${m}`);
        groupsArray = [];
      }
    }
    const tNet = Math.round(tick() - tBeforeNet);

    if (groupsArray.length > 0) {
      const tBeforeUpsert = tick();
      await bulkUpsertZalouserIntegrationGroups(groupsArray, currentAccountId);
      const tWrite = Math.round(tick() - tBeforeUpsert);
      const out = groupsArray.map((g) => ({
        id: g.id,
        name: g.name,
        memberCount: memberCountFromGroupRaw(g.raw),
      }));
      if (forceRefresh) {
        console.info(
          `${log} refresh ${elapsed()}ms db=${tDb} net=${tNet}@${src} write=${tWrite} n=${out.length}`,
        );
      }
      return { success: true, groups: out };
    }

    if (cachedUi.length > 0) {
      if (forceRefresh) {
        console.info(`${log} refresh ${elapsed()}ms db=${tDb} net=${tNet} cache n=${cachedUi.length}`);
      }
      return { success: true, groups: cachedUi };
    }
    if (forceRefresh) console.info(`${log} refresh ${elapsed()}ms db=${tDb} net=${tNet} empty`);
    return { success: true, groups: [] };
  } catch (error) {
    const errString = String(error instanceof Error ? error.message : error);
    console.warn(`${log} ${errString}`);
    return { success: false, groups: [], error: errString };
  }
}

export async function sendZalouserMessage(target: string, message: string) {
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

    // Sau khi gửi thành công qua WS, lưu vào Database
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
      console.error("[Zalo] Lỗi lưu tin nhắn vào DB:", dbError);
      // Tin đã gửi qua Gateway; vẫn báo success cho luồng gửi
    }

    return { success: true };
  } catch (error) {
    const errString = String(error instanceof Error ? error.message : error);
    console.warn("[Zalo] sendZalouserMessage:", errString);
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
    console.error("[Zalo] Lỗi lấy lịch sử tin nhắn:", error);
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
