"use server";

import { exec } from "node:child_process";
import { promisify } from "node:util";
import { stat } from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { resolveZalouserCliQrFilePathForServer } from "@/lib/openclaw-zalouser-cli-qr-path";

const execAsync = promisify(exec);

function getCliCommand() {
  return (process.env.OPENCLAW_CLI ?? "openclaw").trim() || "openclaw";
}

export async function syncZalouserStatus() {
  try {
    const cli = getCliCommand();
    const cmd = `${cli} directory self --channel zalouser`;
    console.log(`[Zalo CLI] Executing: ${cmd}`);
    
    const { stdout, stderr } = await execAsync(cmd);
    console.log(`[Zalo CLI] Output (stdout):\n${stdout.trim()}`);
    if (stderr) console.log(`[Zalo CLI] Lỗi thực thi lệnh (stderr):\n${stderr.trim()}`);

    const data = JSON.parse(stdout);
    
    // Check if we got a valid response indicating logged in
    // `directory self` returns the user info if logged in
    let displayName = "Zalo User";
    let isLinked = false;
    
    if (data && data.self && data.self.id) {
      displayName = data.self.name || "Zalo User";
      isLinked = true;
    }
    
    if (isLinked) {
      await prisma.integrationAccount.upsert({
        where: { provider: "zalouser" },
        update: { displayName, connectedAt: new Date() },
        create: { provider: "zalouser", displayName, connectedAt: new Date() }
      });
    } else {
      // Not linked or error parsing
      await prisma.integrationAccount.deleteMany({
        where: { provider: "zalouser" }
      });
    }
    
    return { success: true, isLinked, displayName };
  } catch (error) {
    const errString = String((error as any)?.stderr || (error as any)?.message || error);
    console.log(`[Zalo CLI] Lỗi thực thi lệnh: \n${errString}`);
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
    if (!forceRefresh) {
      const groupsFromDb = await (prisma as any).integrationGroup.findMany({
        where: { provider: "zalouser" },
        orderBy: { updatedAt: 'desc' }
      });
      if (groupsFromDb.length > 0) {
        return { success: true, groups: groupsFromDb.map((g: any) => ({ id: g.groupId, name: g.name })) };
      }
    }

    const cli = getCliCommand();
    const cmd = `${cli} directory groups list --channel zalouser`;
    console.log(`[Zalo CLI] Executing: ${cmd}`);
    const { stdout, stderr } = await execAsync(cmd);
    console.log(`[Zalo CLI] Groups output (stdout):\n${stdout.trim()}`);
    if (stderr) console.log(`[Zalo CLI] Groups error (stderr):\n${stderr.trim()}`);
    console.log(`[Zalo CLI] Groups fetched successfully`);
    const data = JSON.parse(stdout);
    
    if (data.groups && Array.isArray(data.groups)) {
      // Xóa cũ và lưu mới
      await (prisma as any).integrationGroup.deleteMany({
        where: { provider: "zalouser" }
      });
      
      for (const g of data.groups) {
        if (g.id && g.name) {
          await (prisma as any).integrationGroup.create({
            data: {
              provider: "zalouser",
              groupId: g.id,
              name: g.name
            }
          });
        }
      }
      return { success: true, groups: data.groups };
    }
    
    return { success: true, groups: [] };
  } catch (error) {
    const errString = String((error as any)?.stderr || (error as any)?.message || error);
    console.log(`[Zalo CLI] Lỗi lấy danh sách nhóm: \n${errString}`);
    return { success: false, groups: [], error: errString };
  }
}

export async function sendZaloMessage(target: string, message: string) {
  try {
    const cli = getCliCommand();
    // Escape string for bash
    const escapedMessage = message.replace(/"/g, '\\"');
    const cmd = `${cli} message send --channel zalouser --target "${target}" --message "${escapedMessage}"`;
    console.log(`[Zalo CLI] Executing: ${cmd}`);
    const { stdout, stderr } = await execAsync(cmd);
    console.log(`[Zalo CLI] Message sent output (stdout):\n${stdout.trim()}`);
    if (stderr) console.log(`[Zalo CLI] Message sent error (stderr):\n${stderr.trim()}`);
    return { success: true };
  } catch (error) {
    const errString = String((error as any)?.stderr || (error as any)?.message || error);
    console.log(`[Zalo CLI] Lỗi khi gửi tin nhắn:\n${errString}`);
    return { success: false, error: String(error) };
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
