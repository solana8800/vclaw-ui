"use server";

import { exec } from "node:child_process";
import { promisify } from "node:util";
import { stat } from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { resolveZalouserCliQrFilePathForServer } from "@/lib/zalouser/openclaw-zalouser-cli-qr-path";

const execAsync = promisify(exec);

function getCliCommand() {
  return (process.env.OPENCLAW_CLI ?? "openclaw").trim() || "openclaw";
}

export async function syncZalouserStatus() {
  try {
    const cli = getCliCommand();
    const cmd = `${cli} directory self --channel zalouser --json`;
    console.log(`[Zalo CLI] Executing: ${cmd}`);
    
    let { stdout, stderr } = await execAsync(cmd);
    console.log(`[Zalo CLI] Output (stdout):\n${stdout.trim()}`);
    if (stderr) console.log(`[Zalo CLI] Lỗi thực thi lệnh (stderr):\n${stderr.trim()}`);

    let data;
    try {
      data = JSON.parse(stdout);
    } catch (e) {
      // Nếu không parse được JSON, kiểm tra xem có phải thông báo đăng nhập thành công không
      if (stdout.includes("Login successful.") || (stderr && stderr.includes("Login successful."))) {
        console.log(`[Zalo CLI] Đăng nhập thành công (text), đang lấy lại thông tin định danh...`);
        const retry = await execAsync(cmd);
        data = JSON.parse(retry.stdout);
      } else {
        throw e;
      }
    }
    
    // Check if we got a valid response indicating logged in
    let displayName = "Zalo User";
    let isLinked = false;
    let avatarUrl: string | null = null;
    let accountId: string | null = null;
    
    // Output JSON: { id: "...", name: "...", avatarUrl: "...", kind: "user" }
    if (data && data.id) {
      displayName = data.name || "Zalo User";
      avatarUrl = data.avatarUrl || null;
      accountId = data.id;
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

export async function logoutZalouser() {
  try {
    const cli = getCliCommand();
    const cmd = `${cli} channels logout --channel zalouser`;
    console.log(`[Zalo CLI] Executing: ${cmd}`);
    const { stdout, stderr } = await execAsync(cmd);
    console.log(`[Zalo CLI] Logout output (stdout):\n${stdout.trim()}`);
    if (stderr) console.log(`[Zalo CLI] Logout error (stderr):\n${stderr.trim()}`);
    console.log(`[Zalo CLI] Logout successful`);
    
    // Clear DB
    await prisma.integrationAccount.deleteMany({
      where: { provider: "zalouser" }
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

    const cli = getCliCommand();
    const cmd = `${cli} directory groups list --channel zalouser --json`;
    console.log(`[Zalo CLI] Executing: ${cmd}`);
    const { stdout, stderr } = await execAsync(cmd);
    console.log(`[Zalo CLI] Groups output (stdout):\n${stdout.trim()}`);
    if (stderr) console.log(`[Zalo CLI] Groups error (stderr):\n${stderr.trim()}`);
    console.log(`[Zalo CLI] Groups fetched successfully`);
    const data = JSON.parse(stdout);
    
    let groupsArray: any[] = [];
    if (Array.isArray(data)) {
       groupsArray = data;
    } else if (data && data.groups && Array.isArray(data.groups)) {
       groupsArray = data.groups;
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

export async function sendZalouserMessage(target: string, message: string) {
  try {
    const cli = getCliCommand();
    // Escape string for bash
    const escapedMessage = message.replace(/"/g, '\\"');
    const cmd = `${cli} message send --channel zalouser --target "${target}" --message "${escapedMessage}"`;
    console.log(`[Zalo CLI] Executing: ${cmd}`);
    const { stdout, stderr } = await execAsync(cmd);
    console.log(`[Zalo CLI] Message sent output (stdout):\n${stdout.trim()}`);
    if (stderr) console.log(`[Zalo CLI] Message sent error (stderr):\n${stderr.trim()}`);

    // Sau khi gửi thành công qua CLI, lưu vào Database
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

    return {
      success: true,
      messages: conversation?.messages || []
    };
  } catch (error) {
    console.error("[Zalo CLI] Lỗi lấy lịch sử tin nhắn:", error);
    return { success: false, messages: [], error: String(error) };
  }
}

export async function startZaloLogin() {
  try {
    const cli = getCliCommand();
    const args = ['channels', 'login', '--channel', 'zalouser'];
    
    // Xoá file QR cũ nếu có để chờ file mới chắc chắn hơn
    const resolvedPath = resolveZalouserCliQrFilePathForServer();
    if (resolvedPath) {
      const fs = require('fs/promises');
      await fs.unlink(resolvedPath).catch(() => {}); // Bỏ qua lỗi nếu file không tồn tại
    }

    // Đảm bảo dọn dẹp sạch DB trước khi bắt đầu phiên đăng nhập mới
    // để UI không bị load lại thông tin cũ từ database
    await prisma.integrationAccount.deleteMany({
      where: { provider: "zalouser" }
    });
    await (prisma as any).integrationGroup.deleteMany({
      where: { provider: "zalouser" }
    });

    console.log(`[Zalo CLI] Spawning background: ${cli} ${args.join(' ')}`);
    
    // Spawn hidden process logic.
    // Use stdio: 'inherit' to push all background log outputs directly into Next.js console
    const { spawn } = require('child_process');
    const child = spawn(cli, args, {
      detached: true,
      stdio: 'inherit'
    });
    child.unref();

    if (!resolvedPath) return { success: false, error: "QR Path unresolved" };

    // Đợi tối đa 10s để file QR mọc ra
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 500));
      const fs = require('fs/promises');
      const newStat = await fs.stat(resolvedPath).catch(() => null);
      if (newStat && newStat.size > 0) {
        return { success: true, mtimeMs: newStat.mtimeMs };
      }
    }

    // Fallback: cứ trả về thành công để client ép load
    return { success: true, mtimeMs: Date.now(), warning: "QR file was not detected within 10s" };
  } catch (error) {
    console.error("Error starting Zalo login:", error);
    return { success: false, error: String(error) };
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
