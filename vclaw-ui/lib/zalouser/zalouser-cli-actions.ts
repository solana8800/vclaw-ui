"use server";

import { randomUUID } from "node:crypto";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  extractZalouserIdentityFromChannelsStatusPayload,
  mapDirectorySelfPayload,
  normalizeDirectoryGroupsListPayload,
  normalizeDirectoryPeersListPayload,
  runGatewayWsRpc,
} from "@/lib/openclaw/gateway-ws-rpc-server";
import {
  buildZalouserSessionKey,
  syncZalouserHistoryMessages,
} from "@/lib/zalouser/zalouser-conversation-sync";

const execAsync = promisify(exec);

function getOpenclawCliBinary() {
  return process.env.OPENCLAW_CLI || "openclaw";
}

function zalouserGroupsListShellCommand(): string {
  return `${getOpenclawCliBinary()} directory groups list --channel zalouser --json`;
}

function zalouserPeersListShellCommand(): string {
  return `${getOpenclawCliBinary()} directory peers list --channel zalouser --json`;
}

/** JSON từ CLI — cùng ý nghĩa với WS, đưa qua `normalizeDirectoryGroupsListPayload`. */
async function fetchZalouserGroupsListJsonViaCli(): Promise<unknown> {
  const cmd = zalouserGroupsListShellCommand();
  const { stdout, stderr } = await execAsync(cmd);
  if (stderr?.trim()) console.log("[zalouser:groups] CLI stderr:", stderr.trim());
  return JSON.parse(stdout) as unknown;
}

/** JSON từ CLI — cùng ý nghĩa với WS `directory.peers.list`. */
async function fetchZalouserPeersListJsonViaCli(): Promise<unknown> {
  const cmd = zalouserPeersListShellCommand();
  const { stdout, stderr } = await execAsync(cmd);
  if (stderr?.trim()) console.log("[zalouser:peers] CLI stderr:", stderr.trim());
  return JSON.parse(stdout) as unknown;
}

const ZALOUSER_GROUP_PROVIDER = "zalouser";
/** Tránh vượt giới hạn tham số SQLite (~999); mỗi dòng ~8 cột. */
const INTEGRATION_GROUP_UPSERT_CHUNK = 100;
const INTEGRATION_PEER_UPSERT_CHUNK = 100;

/** Hàng cache `IntegrationPeer` (Prisma client IDE đôi khi chưa kịp sync sau `prisma generate`). */
type ZalouserPeerCacheRow = {
  peerId: string;
  name: string;
  avatarUrl: string | null;
};

type ZalouserPeerDb = {
  findMany: (args: {
    where: { provider: string; accountId?: string | null };
    orderBy: { updatedAt: "desc" };
  }) => Promise<ZalouserPeerCacheRow[]>;
  deleteMany: (args: { where: { provider: string } }) => Promise<{ count: number }>;
};

function zalouserPeerDb(): ZalouserPeerDb {
  return (prisma as unknown as { integrationPeer: ZalouserPeerDb }).integrationPeer;
}

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

async function bulkUpsertZalouserIntegrationPeers(
  peers: { peerId: string; name: string; avatarUrl: string | null }[],
  accountId: string | null,
) {
  const valid = peers.filter((p) => p.peerId?.trim() && p.name?.trim());
  if (valid.length === 0) return;

  const now = new Date();
  for (let offset = 0; offset < valid.length; offset += INTEGRATION_PEER_UPSERT_CHUNK) {
    const chunk = valid.slice(offset, offset + INTEGRATION_PEER_UPSERT_CHUNK);
    const valueRows = chunk.map((p) =>
      Prisma.sql`(${randomUUID()}, ${ZALOUSER_GROUP_PROVIDER}, ${accountId}, ${p.peerId}, ${p.name}, ${p.avatarUrl}, ${now}, ${now})`,
    );
    await prisma.$executeRaw`
      INSERT INTO "IntegrationPeer" ("id", "provider", "accountId", "peerId", "name", "avatarUrl", "createdAt", "updatedAt")
      VALUES ${Prisma.join(valueRows)}
      ON CONFLICT("provider", "peerId") DO UPDATE SET
        "name" = excluded."name",
        "avatarUrl" = excluded."avatarUrl",
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
      await prisma.integrationAccount.upsert({
        where: { provider: "zalouser" },
        update: { displayName, avatarUrl, accountId, connectedAt: new Date() },
        create: { provider: "zalouser", displayName, avatarUrl, accountId, connectedAt: new Date() }
      });
    } else {
      // Chưa liên kết hoặc không đọc được hồ sơ.
      await prisma.integrationAccount.deleteMany({
        where: { provider: "zalouser" }
      });
      // Xóa cache nhóm khi đăng xuất hoặc mất kết nối.
      await prisma.integrationGroup.deleteMany({
        where: { provider: "zalouser" }
      });
      await zalouserPeerDb().deleteMany({
        where: { provider: "zalouser" },
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
    await prisma.integrationGroup.deleteMany({
      where: { provider: "zalouser" },
    });
    await zalouserPeerDb().deleteMany({
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
  let start = Date.now();

  try {
    const currentAccount = await prisma.integrationAccount.findUnique({
      where: { provider: "zalouser" },
    });
    const currentAccountId = currentAccount?.accountId ?? null;

    const cached = await loadZalouserGroupsFromDb(currentAccountId ?? undefined);
    console.log(`${log} loadZalouserGroupsFromDb ${Date.now() - start} ms`);
    const cachedUi = cached.map((g) => ({
      id: g.groupId,
      name: g.name,
      memberCount: g.memberCount,
    }));

    if (!forceRefresh && cachedUi.length > 0) {
      console.info(`${log} cache n=${cachedUi.length}`);
      return { success: true, groups: cachedUi };
    }

    type Row = { id: string; name: string; raw?: { memberCount?: unknown } };
    let groupsArray: Row[] = [];
    start = Date.now();
    try {
      const payload = await runGatewayWsRpc<unknown>({
        method: "directory.groups.list",
        params: { channel: "zalouser" },
        timeoutMs: 45_000,
      });
      console.log(`${log} runGatewayWsRpc ${Date.now() - start} ms`);
      groupsArray = normalizeDirectoryGroupsListPayload(payload) as Row[];
    } catch (wsErr) {
      const wsMsg = wsErr instanceof Error ? wsErr.message : String(wsErr);
      console.log(`${log} runGatewayWsRpc error: ${Date.now() - start} ms ${wsMsg}`);
      try {
        start = Date.now();
        const cliJson = await fetchZalouserGroupsListJsonViaCli();
        console.log(`${log} fetchZalouserGroupsListJsonViaCli ${Date.now() - start} ms`);
        groupsArray = normalizeDirectoryGroupsListPayload(cliJson) as Row[];
      } catch (cliErr) {
        const m = cliErr instanceof Error ? cliErr.message : String(cliErr);
        console.warn(`${log} cli: ${m}`);
        groupsArray = [];
      }
    }

    if (groupsArray.length > 0) {
      start = Date.now();
      await bulkUpsertZalouserIntegrationGroups(groupsArray, currentAccountId);
      console.log(`${log} bulkUpsertZalouserIntegrationGroups ${Date.now() - start} ms n=${groupsArray.length}`);
      const out = groupsArray.map((g) => ({
        id: g.id,
        name: g.name,
        memberCount: memberCountFromGroupRaw(g.raw),
      }));
      return { success: true, groups: out };
    }

    if (cachedUi.length > 0) {
      if (forceRefresh) {
        console.info(`${log} refresh cache from database n=${cachedUi.length}`);
      }
      return { success: true, groups: cachedUi };
    }
    return { success: true, groups: [] };
  } catch (error) {
    const errString = String(error instanceof Error ? error.message : error);
    console.warn(`${log} ${errString}`);
    return { success: false, groups: [], error: errString };
  }
}

/** Cache peer (SQLite) theo tài khoản zalouser. */
async function loadZalouserPeersFromDb(accountId: string | null | undefined) {
  const where =
    accountId != null && accountId !== ""
      ? { provider: ZALOUSER_GROUP_PROVIDER, accountId }
      : { provider: ZALOUSER_GROUP_PROVIDER };
  return zalouserPeerDb().findMany({
    where,
    orderBy: { updatedAt: "desc" },
  });
}

/** DB cache → WS `directory.peers.list` → lỗi thì CLI `directory peers list --json`. */
export async function getZalouserPeers(forceRefresh = false) {
  const log = "[zalouser:peers]";
  let start = Date.now();

  try {
    const currentAccount = await prisma.integrationAccount.findUnique({
      where: { provider: "zalouser" },
    });
    const currentAccountId = currentAccount?.accountId ?? null;

    const cached = await loadZalouserPeersFromDb(currentAccountId ?? undefined);
    console.log(`${log} loadZalouserPeersFromDb ${Date.now() - start} ms`);
    const cachedUi = cached.map((p) => ({
      id: p.peerId,
      name: p.name,
      avatarUrl: p.avatarUrl,
    }));

    if (!forceRefresh && cachedUi.length > 0) {
      console.info(`${log} cache n=${cachedUi.length}`);
      return { success: true, peers: cachedUi };
    }

    type Row = { peerId: string; name: string; avatarUrl: string | null; raw?: unknown };
    let peersArray: Row[] = [];
    start = Date.now();
    try {
      const payload = await runGatewayWsRpc<unknown>({
        method: "directory.peers.list",
        params: { channel: "zalouser" },
        timeoutMs: 45_000,
      });
      console.log(`${log} runGatewayWsRpc ${Date.now() - start} ms`);
      peersArray = normalizeDirectoryPeersListPayload(payload) as Row[];
    } catch (wsErr) {
      const wsMsg = wsErr instanceof Error ? wsErr.message : String(wsErr);
      console.log(`${log} runGatewayWsRpc error: ${Date.now() - start} ms ${wsMsg}`);
      try {
        start = Date.now();
        const cliJson = await fetchZalouserPeersListJsonViaCli();
        console.log(`${log} fetchZalouserPeersListJsonViaCli ${Date.now() - start} ms`);
        peersArray = normalizeDirectoryPeersListPayload(cliJson) as Row[];
      } catch (cliErr) {
        const m = cliErr instanceof Error ? cliErr.message : String(cliErr);
        console.warn(`${log} cli: ${m}`);
        peersArray = [];
      }
    }

    if (peersArray.length > 0) {
      start = Date.now();
      await bulkUpsertZalouserIntegrationPeers(peersArray, currentAccountId);
      console.log(`${log} bulkUpsertZalouserIntegrationPeers ${Date.now() - start} ms n=${peersArray.length}`);
      const out = peersArray.map((p) => ({
        id: p.peerId,
        name: p.name,
        avatarUrl: p.avatarUrl,
      }));
      return { success: true, peers: out };
    }

    if (cachedUi.length > 0) {
      if (forceRefresh) {
        console.info(`${log} refresh cache from database n=${cachedUi.length}`);
      }
      return { success: true, peers: cachedUi };
    }
    return { success: true, peers: [] };
  } catch (error) {
    const errString = String(error instanceof Error ? error.message : error);
    console.warn(`${log} ${errString}`);
    return { success: false, peers: [], error: errString };
  }
}

export async function sendZalouserMessage(target: string, message: string) {
  try {
    const messageId = randomUUID();
    await runGatewayWsRpc<unknown>({
      method: "send",
      params: {
        to: target,
        message,
        channel: "zalouser",
        idempotencyKey: messageId,
      },
      timeoutMs: 90_000,
    });
    console.log("[Zalo Gateway WS] send OK");

    try {
      const currentAccount = await prisma.integrationAccount.findUnique({
        where: { provider: "zalouser" },
      });
      const selfAccountId = currentAccount?.accountId;

      await syncZalouserHistoryMessages({
        sessionKey: buildZalouserSessionKey(target),
        externalThreadId: target,
        title: `Zalo: ${target}`,
        selfAccountId,
        messages: [{
          id: messageId,
          role: "staff",
          text: message,
          createdAt: new Date().toISOString(),
        }],
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

function extractChatHistoryMessages(payload: unknown): unknown[] {
  if (!payload || typeof payload !== "object") return [];
  const p = payload as Record<string, unknown>;
  return Array.isArray(p.messages) ? p.messages : [];
}

export async function syncZalouserConversationFromGatewayHistory(
  target: string,
  title?: string | null,
) {
  const externalThreadId = target.trim();
  if (!externalThreadId) {
    return {
      success: false,
      inserted: 0,
      skipped: 0,
      historyCount: 0,
      error: "Thiếu mã hội thoại Zalo.",
    };
  }
  const sessionKey = buildZalouserSessionKey(externalThreadId);
  try {
    const payload = await runGatewayWsRpc<unknown>({
      method: "chat.history",
      params: { sessionKey, limit: 80 },
      timeoutMs: 30_000,
    });
    const messages = extractChatHistoryMessages(payload);
    console.log(
      `[Zalo] chat.history ${sessionKey}: Gateway trả ${messages.length} tin`,
    );
    if (messages.length === 0) {
      return { success: true, inserted: 0, skipped: 0, historyCount: 0, sessionKey };
    }
    const currentAccount = await prisma.integrationAccount.findUnique({
      where: { provider: "zalouser" },
    });
    const selfAccountId = currentAccount?.accountId;

    const result = await syncZalouserHistoryMessages({
      sessionKey,
      externalThreadId,
      title: title ?? `Zalo: ${externalThreadId}`,
      messages,
      selfAccountId,
      ignoreSelf: true, // Bỏ qua tin nhắn do chủ shop gửi từ app Zalo
    });
    console.log(
      `[Zalo] chat.history ${sessionKey}: thêm ${result.inserted}, bỏ qua ${result.skipped}`,
    );
    return { success: true, sessionKey, historyCount: messages.length, ...result };
  } catch (error) {
    const errString = String(error instanceof Error ? error.message : error);
    console.warn("[Zalo] Không đồng bộ được lịch sử hội thoại:", errString);
    return {
      success: false,
      inserted: 0,
      skipped: 0,
      historyCount: 0,
      sessionKey,
      error: errString,
    };
  }
}

export async function getZalouserMessages(groupId: string) {
  try {
    // Chuẩn hóa ID: loại bỏ prefix 'user:' hoặc 'group:' nếu có
    const normalizedId = groupId.replace(/^(user|group):/i, "").trim();

    // Tìm tất cả các tin nhắn thuộc các session của cùng một thread
    const messages = await prisma.conversationMessage.findMany({
      where: {
        conversation: {
          provider: "zalouser",
          externalThreadId: normalizedId,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100, // Lấy 100 tin nhắn gần nhất
    });

    return {
      success: true,
      messages: messages.reverse(),
    };
  } catch (error) {
    console.error("[Zalo] Lỗi lấy lịch sử tin nhắn:", error);
    return { success: false, messages: [], error: String(error) };
  }
}

/** Chuẩn bị phiên đăng nhập mới: xóa bản ghi tích hợp zalouser trong DB (QR qua WS `web.login.*`). */
export async function prepareZalouserLoginSession() {
  try {
    await prisma.integrationAccount.deleteMany({
      where: { provider: "zalouser" },
    });
    await prisma.integrationGroup.deleteMany({
      where: { provider: "zalouser" },
    });
    await zalouserPeerDb().deleteMany({
      where: { provider: "zalouser" },
    });
    return { success: true as const };
  } catch (error) {
    console.error("[Zalo] prepareZalouserLoginSession:", error);
    return { success: false as const, error: String(error) };
  }
}

/** Lưu tin nhắn đến (real-time từ WebSocket) vào DB. */
export async function saveZalouserIncomingMessage(payload: unknown) {
  const { handleZalouserGatewayEvent } = await import(
    "@/lib/zalouser/zalouser-conversation-sync"
  );
  return handleZalouserGatewayEvent("session.message", payload);
}
