"use server";

import { exec } from "node:child_process";
import { promisify } from "node:util";
import { prisma } from "@/lib/prisma";

const execAsync = promisify(exec);

function getCliCommand() {
  return (process.env.OPENCLAW_CLI ?? "openclaw").trim() || "openclaw";
}

export async function syncZalouserStatus() {
  try {
    const cli = getCliCommand();
    const { stdout } = await execAsync(`${cli} directory self --channel zalouser`);
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
    console.error("Error syncing Zalo status:", error);
    // If CLI fails, we assume offline/not linked
    await prisma.integrationAccount.deleteMany({
      where: { provider: "zalouser" }
    });
    return { success: false, isLinked: false, error: String(error) };
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
    await execAsync(`${cli} channels logout --channel zalouser`);
    
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

export async function getZalouserGroups() {
  try {
    const cli = getCliCommand();
    const { stdout } = await execAsync(`${cli} directory groups list --channel zalouser`);
    const data = JSON.parse(stdout);
    
    return { success: true, groups: data.groups || [] };
  } catch (error) {
    console.error("Error getting Zalo groups:", error);
    return { success: false, groups: [], error: String(error) };
  }
}
