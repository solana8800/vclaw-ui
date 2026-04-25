/**
 * Một RPC OpenClaw qua WebSocket từ Node (Server Actions).
 * Handshake giống `lib/gateway/client.ts`: `connect.challenge` → `connect` → `method`.
 */
import WebSocket from "ws";

import { getGatewayAuthToken, getPublicGatewayAuthToken } from "@/lib/gateway/env";
import { resolveGatewayWebSocketUrlForServer } from "@/lib/gateway/ws-url";

function buildConnectFrame(authToken: string): { authId: string; frame: Record<string, unknown> } {
  const authId = `auth-${Math.random().toString(36).slice(2, 11)}`;
  return {
    authId,
    frame: {
      type: "req",
      id: authId,
      method: "connect",
      params: {
        minProtocol: 3,
        maxProtocol: 3,
        // Không dùng openclaw-control-ui + webchat: Gateway bật check Origin (Control UI).
        // Server Action = backend, không có Origin trình duyệt → dùng gateway-client + backend.
        client: {
          id: "gateway-client",
          version: "2026.4.15",
          platform: typeof process !== "undefined" ? process.platform : "node",
          mode: "backend",
        },
        role: "operator",
        caps: ["tool-events"],
        scopes: ["operator.read", "operator.write", "operator.admin"],
        auth: { token: authToken },
      },
    },
  };
}

export async function runGatewayWsRpc<T = unknown>(opts: {
  method: string;
  params?: Record<string, unknown>;
  timeoutMs?: number;
}): Promise<T> {
  const token = (getGatewayAuthToken() ?? getPublicGatewayAuthToken())?.trim();
  if (!token) {
    throw new Error(
      "Thiếu OPENCLAW_GATEWAY_TOKEN hoặc NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN để gọi Gateway WS.",
    );
  }
  const url = resolveGatewayWebSocketUrlForServer();
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const { authId, frame: connectFrame } = buildConnectFrame(token);

  return new Promise<T>((resolve, reject) => {
    let settled = false;
    let connectSent = false;
    let rpcId: string | null = null;

    const timer = setTimeout(() => {
      done(new Error(`Gateway WS hết thời gian (${timeoutMs}ms): ${opts.method}`));
    }, timeoutMs);

    const ws = new WebSocket(url);

    function done(err?: Error, payload?: T) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        ws.removeAllListeners();
      } catch {
        /* ignore */
      }
      try {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
      } catch {
        /* ignore */
      }
      if (err) reject(err);
      else resolve(payload as T);
    }

    /** RPC: `{ type:"req", id, method, params }` sau `connect`. */
    function sendRpc() {
      rpcId = Math.random().toString(36).slice(2, 11);
      ws.send(
        JSON.stringify({
          type: "req",
          id: rpcId,
          method: opts.method,
          params: opts.params ?? {},
        }),
      );
    }

    ws.on("message", (raw: WebSocket.RawData) => {
      let frame: Record<string, unknown>;
      try {
        frame = JSON.parse(String(raw)) as Record<string, unknown>;
      } catch {
        return;
      }
      if (frame.type === "event" && frame.event === "connect.challenge") {
        if (connectSent) return;
        connectSent = true;
        try {
          ws.send(JSON.stringify(connectFrame));
        } catch (e) {
          done(e instanceof Error ? e : new Error(String(e)));
        }
        return;
      }
      if (frame.type === "res") {
        const id = typeof frame.id === "string" ? frame.id : "";
        if (id === authId) {
          if (!frame.ok) {
            const errObj = frame.error as { message?: string } | undefined;
            const msg =
              (errObj && typeof errObj.message === "string" && errObj.message) ||
              (typeof frame.error === "string" ? frame.error : "connect failed");
            done(new Error(msg));
            return;
          }
          try {
            sendRpc();
          } catch (e) {
            done(e instanceof Error ? e : new Error(String(e)));
          }
          return;
        }
        if (rpcId && id === rpcId) {
          if (!frame.ok) {
            const errObj = frame.error as { message?: string } | undefined;
            const msg =
              (errObj && typeof errObj.message === "string" && errObj.message) ||
              (typeof frame.error === "string" ? frame.error : `${opts.method} failed`);
            done(new Error(msg));
            return;
          }
          done(undefined, frame.payload as T);
        }
      }
    });

    ws.on("error", (err) => {
      done(err instanceof Error ? err : new Error(String(err)));
    });

    ws.on("close", () => {
      if (!settled) {
        done(new Error("WebSocket đóng trước khi nhận xong phản hồi Gateway"));
      }
    });
  });
}

export type DirectorySelfRow = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

/** Chuẩn hoá payload `directory.self` (cùng ý nghĩa với JSON CLI `directory self`). */
export function mapDirectorySelfPayload(payload: unknown): DirectorySelfRow | null {
  if (payload == null) return null;
  if (typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  const id = typeof p.id === "string" ? p.id.trim() : "";
  if (!id) return null;
  const name =
    (typeof p.name === "string" && p.name.trim()) ||
    (typeof p.displayName === "string" && p.displayName.trim()) ||
    "Zalo User";
  const avatarUrl =
    typeof p.avatarUrl === "string" && p.avatarUrl.trim() ? (p.avatarUrl as string).trim() : null;
  return { id, name, avatarUrl };
}

type ZalouserProbeLike = {
  ok?: boolean;
  user?: { userId?: string; displayName?: string; avatar?: string };
};

function rowFromZcaUserLike(user: {
  userId?: string;
  displayName?: string;
  avatar?: string;
}): DirectorySelfRow | null {
  const id = typeof user.userId === "string" ? user.userId.trim() : "";
  if (!id) return null;
  const name =
    (typeof user.displayName === "string" && user.displayName.trim()) || "Zalo User";
  const avatarUrl =
    typeof user.avatar === "string" && user.avatar.trim() ? user.avatar.trim() : null;
  return { id, name, avatarUrl };
}

/**
 * Gateway lõi OpenClaw thường **không** có RPC `directory.self`; thông tin zalouser nằm trong
 * `channels.status` (`probe` = kết quả `probeZalouser` → `user` kiểu ZcaUserInfo).
 */
export function extractZalouserIdentityFromChannelsStatusPayload(
  payload: unknown,
): DirectorySelfRow | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  const channelAccounts = p.channelAccounts;
  if (!channelAccounts || typeof channelAccounts !== "object") return null;
  const zlRaw = (channelAccounts as Record<string, unknown>).zalouser;
  if (!Array.isArray(zlRaw) || zlRaw.length === 0) return null;

  const defaultIdRaw = (p.channelDefaultAccountId as Record<string, unknown> | undefined)?.zalouser;
  const defaultId = typeof defaultIdRaw === "string" ? defaultIdRaw.trim() : "";

  const snaps = zlRaw as Record<string, unknown>[];
  let snap =
    defaultId && snaps.length > 0
      ? snaps.find((s) => String(s.accountId ?? "") === defaultId)
      : undefined;
  if (!snap) snap = snaps[0];

  const probe = snap?.probe as ZalouserProbeLike | undefined;
  if (probe?.ok === true && probe.user) {
    const row = rowFromZcaUserLike(probe.user);
    if (row) return row;
  }

  const profile = snap?.profile;
  if (profile && typeof profile === "object") {
    const pr = profile as Record<string, unknown>;
    const userLike = {
      userId: typeof pr.userId === "string" ? pr.userId : undefined,
      displayName:
        typeof pr.displayName === "string"
          ? pr.displayName
          : typeof pr.name === "string"
            ? pr.name
            : undefined,
      avatar: typeof pr.avatar === "string" ? pr.avatar : undefined,
    };
    return rowFromZcaUserLike(userLike);
  }

  return null;
}

/** Một dòng nhóm sau `directory.groups.list` (hoặc tương đương JSON CLI). */
export type DirectoryGroupListRow = {
  id: string;
  name: string;
  raw?: unknown;
};

/**
 * Chuẩn hoá payload `directory.groups.list` (WS) hoặc JSON CLI `directory groups list`:
 * mảng trực tiếp, hoặc `{ groups | entries | results }`.
 */
export function normalizeDirectoryGroupsListPayload(payload: unknown): DirectoryGroupListRow[] {
  let list: unknown[] = [];
  if (Array.isArray(payload)) {
    list = payload;
  } else if (payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>;
    if (Array.isArray(p.groups)) list = p.groups;
    else if (Array.isArray(p.entries)) list = p.entries;
    else if (Array.isArray(p.results)) list = p.results;
  }
  const out: DirectoryGroupListRow[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    let id = typeof o.id === "string" ? o.id.trim() : "";
    if (!id && typeof o.groupId === "string" && o.groupId.trim()) {
      id = o.groupId.trim().startsWith("group:") ? o.groupId.trim() : `group:${o.groupId.trim()}`;
    }
    const nameRaw = o.name;
    let name =
      typeof nameRaw === "string" ? nameRaw.trim() : String(nameRaw ?? "").trim();
    if (!name) {
      const rawName =
        o.raw && typeof o.raw === "object"
          ? String((o.raw as Record<string, unknown>).name ?? "").trim()
          : "";
      name = rawName || id || "Nhóm";
    }
    if (!id) continue;
    out.push({ id, name, raw: o.raw ?? o });
  }
  return out;
}

/** Một dòng peer (bạn / DM) sau `directory.peers.list` hoặc JSON CLI `directory peers list`. */
export type DirectoryPeerListRow = {
  /** Mã gửi tin chuẩn, ví dụ `user:3449465574915916286` */
  peerId: string;
  name: string;
  avatarUrl: string | null;
  raw?: unknown;
};

function canonicalZalouserUserPeerId(rawId: string): string | null {
  const t = rawId.trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  if (lower.startsWith("user:")) {
    const rest = t.slice(t.indexOf(":") + 1).trim();
    return rest ? `user:${rest}` : null;
  }
  return `user:${t}`;
}

/**
 * Chuẩn hoá payload `directory.peers.list` (WS) hoặc JSON CLI `directory peers list`:
 * mảng `{ kind, id, name, avatarUrl, raw }`, hoặc bọc `{ peers | entries | results }`.
 */
export function normalizeDirectoryPeersListPayload(payload: unknown): DirectoryPeerListRow[] {
  let list: unknown[] = [];
  if (Array.isArray(payload)) {
    list = payload;
  } else if (payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>;
    if (Array.isArray(p.peers)) list = p.peers;
    else if (Array.isArray(p.entries)) list = p.entries;
    else if (Array.isArray(p.results)) list = p.results;
  }
  const out: DirectoryPeerListRow[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const kind = typeof o.kind === "string" ? o.kind.toLowerCase() : "";
    if (kind && kind !== "user") continue;

    let rawId = typeof o.id === "string" ? o.id.trim() : "";
    if (!rawId && o.raw && typeof o.raw === "object") {
      const r = o.raw as Record<string, unknown>;
      rawId = typeof r.userId === "string" ? r.userId.trim() : "";
    }
    const peerId = canonicalZalouserUserPeerId(rawId);
    if (!peerId) continue;

    const nameTop = typeof o.name === "string" ? o.name.trim() : "";
    let name = nameTop;
    if (!name && o.raw && typeof o.raw === "object") {
      const r = o.raw as Record<string, unknown>;
      name =
        (typeof r.displayName === "string" && r.displayName.trim()) ||
        (typeof r.name === "string" && r.name.trim()) ||
        "";
    }
    if (!name) name = peerId;

    let avatarUrl: string | null = null;
    if (typeof o.avatarUrl === "string" && o.avatarUrl.trim()) {
      avatarUrl = o.avatarUrl.trim();
    } else if (o.raw && typeof o.raw === "object") {
      const r = o.raw as Record<string, unknown>;
      if (typeof r.avatar === "string" && r.avatar.trim()) avatarUrl = r.avatar.trim();
    }

    out.push({ peerId, name, avatarUrl, raw: o.raw ?? o });
  }
  return out;
}
