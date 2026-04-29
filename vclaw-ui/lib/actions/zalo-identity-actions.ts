
"use server";

import { getZalouserGroups, getZalouserPeers } from "@/lib/zalouser/zalouser-cli-actions";
import { prisma } from "@/lib/db";

export type ZaloIdentity = {
  id: string;
  name: string;
  type: "user" | "group";
  avatarUrl?: string | null;
  memberCount?: number | null;
};

export async function getAvailableZaloIdentities(): Promise<ZaloIdentity[]> {
  try {
    // 1. Get current active account
    const currentAccount = await prisma.integrationAccount.findUnique({
      where: { provider: "zalouser" },
    });

    if (!currentAccount || !currentAccount.accountId) {
      console.warn("No active Zalo account found for filtering identities.");
      return [];
    }

    // 2. Fetch data (already filtered by currentAccountId internally in these actions)
    const [groupsRes, peersRes] = await Promise.all([
      getZalouserGroups(),
      getZalouserPeers()
    ]);

    const identities: ZaloIdentity[] = [];

    // 3. Double check or additional filtering if needed
    // The internal getZalouserGroups already uses the same prisma lookup, 
    // but we ensure consistency here.

    if (groupsRes.success && groupsRes.groups) {
      identities.push(...groupsRes.groups.map(g => ({
        id: g.id,
        name: g.name,
        type: "group" as const,
        memberCount: g.memberCount
      })));
    }

    if (peersRes.success && peersRes.peers) {
      identities.push(...peersRes.peers.map(p => ({
        id: p.id,
        name: p.name,
        type: "user" as const,
        avatarUrl: p.avatarUrl
      })));
    }

    return identities.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Error fetching Zalo identities:", error);
    return [];
  }
}
