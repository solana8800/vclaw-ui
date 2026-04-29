/**
 * Một RPC OpenClaw qua WebSocket từ Node (Server Actions).
 * Handshake giống `lib/gateway/client.ts`: `connect.challenge` → `connect` → `method`.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import WebSocket from "ws";

import { getGatewayAuthToken, getPublicGatewayAuthToken } from "@/lib/gateway/env";
import { resolveGatewayWebSocketUrlForServer } from "@/lib/gateway/ws-url";

type GatewayDeviceIdentity = {
  deviceId: string;
  publicKeyPem: string;
  privateKeyPem: string;
};

const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");
const GATEWAY_CLIENT_ID = "gateway-client";
const GATEWAY_CLIENT_MODE = "backend";
const GATEWAY_ROLE = "operator";
const GATEWAY_SCOPES = ["operator.read", "operator.write", "operator.admin"];

function base64UrlEncode(buf: Buffer): string {
  return buf.toString("base64").replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function derivePublicKeyRaw(publicKeyPem: string): Buffer {
  const key = crypto.createPublicKey(publicKeyPem);
  const spki = key.export({ type: "spki", format: "der" }) as Buffer;
  if (
    spki.length === ED25519_SPKI_PREFIX.length + 32 &&
    spki.subarray(0, ED25519_SPKI_PREFIX.length).equals(ED25519_SPKI_PREFIX)
  ) {
    return spki.subarray(ED25519_SPKI_PREFIX.length);
  }
  return spki;
}

function fingerprintPublicKey(publicKeyPem: string): string {
  return crypto.createHash("sha256").update(derivePublicKeyRaw(publicKeyPem)).digest("hex");
}

function generateGatewayDeviceIdentity(): GatewayDeviceIdentity {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();
  const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  return {
    deviceId: fingerprintPublicKey(publicKeyPem),
    publicKeyPem,
    privateKeyPem,
  };
}

function resolveGatewayDeviceIdentityPath(): string {
  const configured = process.env.VCLAW_GATEWAY_DEVICE_IDENTITY_PATH?.trim();
  if (configured) return configured;
  return path.join(os.homedir(), ".vclaw", "gateway-device-identity.json");
}

function loadOrCreateGatewayDeviceIdentity(): GatewayDeviceIdentity {
  const filePath = resolveGatewayDeviceIdentityPath();
  try {
    if (fs.existsSync(filePath)) {
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as {
        deviceId?: unknown;
        publicKeyPem?: unknown;
        privateKeyPem?: unknown;
      };
      if (
        typeof parsed.deviceId === "string" &&
        typeof parsed.publicKeyPem === "string" &&
        typeof parsed.privateKeyPem === "string"
      ) {
        return {
          deviceId: parsed.deviceId,
          publicKeyPem: parsed.publicKeyPem,
          privateKeyPem: parsed.privateKeyPem,
        };
      }
    }
  } catch {
    // Nếu identity cũ hỏng, tạo lại để gateway local có thể auto-approve thiết bị mới.
  }

  const identity = generateGatewayDeviceIdentity();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    `${JSON.stringify({ version: 1, ...identity, createdAtMs: Date.now() }, null, 2)}\n`,
    { mode: 0o600 },
  );
  try {
    fs.chmodSync(filePath, 0o600);
  } catch {
    // best-effort trên filesystem không hỗ trợ chmod.
  }
  return identity;
}

function buildDeviceAuthPayload(input: {
  identity: GatewayDeviceIdentity;
  scopes: string[];
  signedAtMs: number;
  token: string;
  nonce: string;
}): string {
  return [
    "v3",
    input.identity.deviceId,
    GATEWAY_CLIENT_ID,
    GATEWAY_CLIENT_MODE,
    GATEWAY_ROLE,
    input.scopes.join(","),
    String(input.signedAtMs),
    input.token,
    input.nonce,
    process.platform.toLowerCase(),
    "",
  ].join("|");
}

function buildSignedGatewayDevice(input: { authToken: string; nonce: string; scopes: string[] }) {
  const identity = loadOrCreateGatewayDeviceIdentity();
  const signedAtMs = Date.now();
  const payload = buildDeviceAuthPayload({
    identity,
    scopes: input.scopes,
    signedAtMs,
    token: input.authToken,
    nonce: input.nonce,
  });
  const signature = crypto.sign(
    null,
    Buffer.from(payload, "utf8"),
    crypto.createPrivateKey(identity.privateKeyPem),
  );
  return {
    id: identity.deviceId,
    publicKey: base64UrlEncode(derivePublicKeyRaw(identity.publicKeyPem)),
    signature: base64UrlEncode(signature),
    signedAt: signedAtMs,
    nonce: input.nonce,
  };
}

function buildConnectFrame(input: {
  authToken: string;
  nonce: string;
}): { authId: string; frame: Record<string, unknown> } {
  const authId = `auth-${Math.random().toString(36).slice(2, 11)}`;
  const device = buildSignedGatewayDevice({
    authToken: input.authToken,
    nonce: input.nonce,
    scopes: GATEWAY_SCOPES,
  });
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
          id: GATEWAY_CLIENT_ID,
          version: "2026.4.15",
          platform: typeof process !== "undefined" ? process.platform : "node",
          mode: GATEWAY_CLIENT_MODE,
        },
        role: GATEWAY_ROLE,
        caps: ["tool-events"],
        scopes: GATEWAY_SCOPES,
        auth: { token: input.authToken },
        device,
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

  return new Promise<T>((resolve, reject) => {
    let settled = false;
    let connectSent = false;
    let rpcId: string | null = null;
    let authId: string | null = null;

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
        const payload = frame.payload as { nonce?: unknown } | undefined;
        const nonce = typeof payload?.nonce === "string" ? payload.nonce.trim() : "";
        if (!nonce) {
          done(new Error("Gateway WS thiếu nonce connect.challenge."));
          return;
        }
        const connect = buildConnectFrame({ authToken: token, nonce });
        authId = connect.authId;
        try {
          ws.send(JSON.stringify(connect.frame));
        } catch (e) {
          done(e instanceof Error ? e : new Error(String(e)));
        }
        return;
      }
      if (frame.type === "res") {
        const id = typeof frame.id === "string" ? frame.id : "";
        if (authId && id === authId) {
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

type DirectorySelfRow = {
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
type DirectoryGroupListRow = {
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
type DirectoryPeerListRow = {
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
