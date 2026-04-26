/**
 * Gateway client — browser / 'use client'
 *
 * REST/MCP calls go through Next.js route handler /api/gateway/* so that
 * middleware (auth tokens, logging) can intercept them uniformly.
 *
 * WebSocket connects trực tiếp tới gateway trên localhost.
 */

import { getGatewayWebSocketUrl } from "@/lib/gateway/ws-url";

const API_BASE = "/api/gateway";
const GATEWAY_DEVICE_STORAGE_KEY = "vclaw.gateway.deviceIdentity.v1";
const GATEWAY_CLIENT_ID = "openclaw-control-ui";
const GATEWAY_CLIENT_MODE = "webchat";
const GATEWAY_ROLE = "operator";
const GATEWAY_SCOPES = ["operator.read", "operator.write", "operator.admin"];
const ED25519_SPKI_PREFIX = new Uint8Array([
  0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00,
]);

type BrowserGatewayDeviceIdentity = {
  deviceId: string;
  publicKeyJwk: JsonWebKey;
  privateKeyJwk: JsonWebKey;
};

function base64UrlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const raw = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of raw) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", toArrayBuffer(bytes)));
  return Array.from(digest)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function deriveRawEd25519PublicKey(spki: ArrayBuffer): Uint8Array {
  const bytes = new Uint8Array(spki);
  const hasPrefix =
    bytes.length === ED25519_SPKI_PREFIX.length + 32 &&
    ED25519_SPKI_PREFIX.every((byte, index) => bytes[index] === byte);
  return hasPrefix ? bytes.slice(ED25519_SPKI_PREFIX.length) : bytes;
}

async function importGatewayDeviceIdentity(identity: BrowserGatewayDeviceIdentity) {
  const [publicKey, privateKey] = await Promise.all([
    crypto.subtle.importKey("jwk", identity.publicKeyJwk, "Ed25519", true, ["verify"]),
    crypto.subtle.importKey("jwk", identity.privateKeyJwk, "Ed25519", true, ["sign"]),
  ]);
  return { identity, publicKey, privateKey };
}

async function loadOrCreateGatewayDeviceIdentity() {
  const stored = localStorage.getItem(GATEWAY_DEVICE_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as BrowserGatewayDeviceIdentity;
      if (parsed.deviceId && parsed.publicKeyJwk && parsed.privateKeyJwk) {
        return await importGatewayDeviceIdentity(parsed);
      }
    } catch {
      localStorage.removeItem(GATEWAY_DEVICE_STORAGE_KEY);
    }
  }

  const keyPair = await crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"]);
  const [publicKeyJwk, privateKeyJwk, publicKeySpki] = await Promise.all([
    crypto.subtle.exportKey("jwk", keyPair.publicKey),
    crypto.subtle.exportKey("jwk", keyPair.privateKey),
    crypto.subtle.exportKey("spki", keyPair.publicKey),
  ]);
  const rawPublicKey = deriveRawEd25519PublicKey(publicKeySpki);
  const identity: BrowserGatewayDeviceIdentity = {
    deviceId: await sha256Hex(rawPublicKey),
    publicKeyJwk,
    privateKeyJwk,
  };
  localStorage.setItem(GATEWAY_DEVICE_STORAGE_KEY, JSON.stringify(identity));
  return { identity, publicKey: keyPair.publicKey, privateKey: keyPair.privateKey };
}

async function buildGatewayDeviceAuth(input: { token?: string; nonce: string }) {
  if (!input.token || !input.nonce) return undefined;
  const { identity, publicKey, privateKey } = await loadOrCreateGatewayDeviceIdentity();
  const signedAt = Date.now();
  const publicKeySpki = await crypto.subtle.exportKey("spki", publicKey);
  const rawPublicKey = deriveRawEd25519PublicKey(publicKeySpki);
  const payload = [
    "v3",
    identity.deviceId,
    GATEWAY_CLIENT_ID,
    GATEWAY_CLIENT_MODE,
    GATEWAY_ROLE,
    GATEWAY_SCOPES.join(","),
    String(signedAt),
    input.token,
    input.nonce,
    "web",
    "",
  ].join("|");
  const signature = await crypto.subtle.sign("Ed25519", privateKey, new TextEncoder().encode(payload));
  return {
    id: identity.deviceId,
    publicKey: base64UrlEncode(rawPublicKey),
    signature: base64UrlEncode(signature),
    signedAt,
    nonce: input.nonce,
  };
}

// ── Types ──────────────────────────────────────────────────────────────────

export type McpRequest = {
  method: string;
  params?: Record<string, unknown>;
};

export type McpResponse<T = unknown> = {
  jsonrpc: "2.0";
  id?: string | number | null;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
};

// ── REST & MCP helpers ──────────────────────────────────────────────────────

async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    headers: { "content-type": "application/json", ...init.headers },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Gateway ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const gatewayClient = {
  get<T = unknown>(path: string): Promise<T> {
    return apiFetch<T>(path);
  },

  post<T = unknown>(path: string, body: unknown): Promise<T> {
    return apiFetch<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /** 
   * Gọi một MCP Tool (Model Context Protocol) 
   * OpenClaw hỗ trợ MCP qua các endpoint như /mcp/v1/tools/call
   */
  async callTool<T = unknown>(name: string, args: Record<string, unknown> = {}): Promise<T> {
    const response = await this.post<McpResponse<T>>("/mcp/v1/tools/call", {
      name,
      arguments: args,
    });

    if (response.error) {
      throw new Error(`MCP Error [${response.error.code}]: ${response.error.message}`);
    }

    return response.result as T;
  },

  /** SSE stream — Trả về AsyncGenerator lặp qua các dòng JSON */
  async *stream(path: string, body: unknown): AsyncGenerator<unknown> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "text/event-stream",
      },
      body: JSON.stringify(body),
    });
    if (!res.body) return;

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const raw = line.slice(6).trim();
          console.debug("[Gateway] Received stream data:", raw);
          if (raw === "[DONE]") return;
          try {
            yield JSON.parse(raw);
          } catch {
            yield raw;
          }
        }
      }
    }
  },
};

// ── WebSocket ─────────────────────────────────────────────────────────────────

export type GatewayWsSessionMessagePayload = {
  sessionKey?: string;
  message?: unknown;
  [key: string]: unknown;
};

type GatewayEventFrame = {
  type: "event";
  event: string;
  payload?: Record<string, unknown>;
};

type GatewayResponseFrame = {
  type: "res";
  id?: string;
  ok?: boolean;
  payload?: unknown;
  error?: unknown;
};

type GatewayFrame = GatewayEventFrame | GatewayResponseFrame;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export type GatewayWsOptions = {
  path?: string;
  token?: string;
  onChatDelta?: (delta: string) => void;
  onAgentEvent?: (payload: unknown) => void;
  onChatDone?: () => void;
  onChatError?: (message: string) => void;
  /** Tin mới trong session (sau sessions.messages.subscribe). */
  onSessionMessage?: (payload: GatewayWsSessionMessagePayload) => void;
  onSessionsChanged?: (payload: unknown) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (e: Event) => void;
};

const WS_READY_LABELS = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"] as const;

function wsReadyStateLabel(state: number | undefined): string | undefined {
  if (state === undefined) return undefined;
  return WS_READY_LABELS[state] ?? `unknown(${state})`;
}

/** Browser `Event` in `onerror` stringifies as `[object Event]` — log fields explicitly. */
function logGatewayWsError(ev: Event, context: { url: string; readyState?: number }) {
  const payload: Record<string, unknown> = {
    url: context.url,
    readyState: context.readyState,
    readyStateLabel: wsReadyStateLabel(context.readyState),
    eventType: ev.type,
  };
  // Tránh `instanceof ErrorEvent` khi ErrorEvent không có (SSR/edge) hoặc event từ realm khác.
  const ErrCtor =
    typeof globalThis !== "undefined" && "ErrorEvent" in globalThis
      ? (globalThis as unknown as { ErrorEvent: typeof ErrorEvent }).ErrorEvent
      : undefined;
  if (ErrCtor && ev instanceof ErrCtor) {
    const ee = ev as ErrorEvent;
    payload.message = ee.message;
    payload.filename = ee.filename;
    payload.lineno = ee.lineno;
    if (ee.error != null) payload.cause = ee.error;
  } else {
    const duck = ev as unknown as { message?: unknown; filename?: unknown; lineno?: unknown; error?: unknown };
    if (typeof duck.message === "string") payload.message = duck.message;
    if (typeof duck.filename === "string") payload.filename = duck.filename;
    if (typeof duck.lineno === "number") payload.lineno = duck.lineno;
    if (duck.error != null) payload.cause = duck.error;
  }
  console.error("[GatewayWS] WebSocket error", payload);
}

/**
 * Quản lý kết nối WebSocket tới OpenClaw Core.
 */
class GatewayWsManager {
  private ws: WebSocket | null = null;
  private pending = new Map<string, { resolve: (v: unknown) => void, reject: (e: unknown) => void }>();
  private queue: Array<{
    method: string;
    params: unknown;
    resolve: (value: unknown) => void;
    reject: (reason?: unknown) => void;
  }> = [];
  private opts: GatewayWsOptions | null = null;
  private connected = false;
  private authenticated = false;
  private connecting = false;
  private intentionalClose = false;

  connect(opts: GatewayWsOptions) {
    if (this.connected || this.connecting) return;
    this.intentionalClose = false;
    this.connecting = true;
    this.opts = opts;
    
    const url = getGatewayWebSocketUrl(opts.path || "/ws");
    console.log("[GatewayWS] Connecting to", url);
    
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log("[GatewayWS] Socket opened, waiting for challenge...");
      this.connected = true;
      this.connecting = false;
      opts.onOpen?.();
    };

    this.ws.onmessage = (ev) => {
      try {
        const frame = JSON.parse(ev.data);
        this.handleFrame(frame);
      } catch (e) {
        console.error("[GatewayWS] Parse error:", e);
      }
    };

    this.ws.onerror = (e) => {
      logGatewayWsError(e, { url, readyState: this.ws?.readyState });
      this.resetState();
      opts.onError?.(e);
    };

    this.ws.onclose = () => {
      this.resetState();
      opts.onClose?.();
      if (!this.intentionalClose && this.opts) {
        console.log("[GatewayWS] Closed, reconnecting in 3s...");
        setTimeout(() => this.connect(this.opts!), 3000);
      }
    };
  }

  /** Đóng socket và không tự reconnect (dùng khi unmount trang admin). */
  disconnect() {
    this.intentionalClose = true;
    this.ws?.close();
    this.ws = null;
    this.resetState();
  }

  private resetState() {
    this.connected = false;
    this.authenticated = false;
    this.connecting = false;
    this.ws = null;
  }

  private flushQueue() {
    console.log(`[GatewayWS] Authenticated! Flushing queue (${this.queue.length} items)`);
    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (item) {
        this.request(item.method, item.params)
          .then(item.resolve)
          .catch(item.reject);
      }
    }
  }

  private listeners = new Map<string, Set<(payload: unknown) => void>>();

  on(event: string, cb: (payload: unknown) => void) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(cb);
    return () => this.off(event, cb);
  }

  off(event: string, cb: (payload: unknown) => void) {
    this.listeners.get(event)?.delete(cb);
  }

  private emit(event: string, payload: unknown) {
    this.listeners.get(event)?.forEach(cb => cb(payload));
  }

  private handleFrame(frame: GatewayFrame) {
    if (frame.type === "event" && frame.event) {
      this.emit(frame.event, frame.payload);
      
      // Tương thích ngược với opts cũ
      if (frame.event === "agent") {
        const p = asRecord(frame.payload);
        const data = asRecord(p.data);
        this.opts?.onAgentEvent?.(p);
        if (p.stream === "assistant" && typeof data.delta === "string") {
          this.opts?.onChatDelta?.(data.delta);
        }
      } else if (frame.event === "chat") {
        const payload = asRecord(frame.payload);
        if (payload.state === "delta") {
          const message = asRecord(payload.message);
          const content = Array.isArray(message.content) ? message.content : [];
          const first = asRecord(content[0]);
          this.opts?.onChatDelta?.(typeof first.text === "string" ? first.text : "");
        } else if (payload.state === "final" || payload.state === "done") {
          this.opts?.onChatDone?.();
        } else if (payload.state === "error") {
          const errorMessage =
            typeof payload.errorMessage === "string" && payload.errorMessage.trim()
              ? payload.errorMessage.trim()
              : "Gateway chat error";
          this.opts?.onChatError?.(errorMessage);
          this.opts?.onChatDone?.();
        }
      } else if (frame.event === "session.message") {
        this.opts?.onSessionMessage?.(frame.payload ?? {});
      } else if (frame.event === "sessions.changed") {
        this.opts?.onSessionsChanged?.(frame.payload);
      }
    }

    // 1. Xử lý Challenge (Nonce) từ Server
    if (frame.type === "event" && frame.event === "connect.challenge") {
      console.log("[GatewayWS] Received challenge, sending connect...");
      const nonce = typeof frame.payload?.nonce === "string" ? frame.payload.nonce.trim() : "";
      void this.sendConnect(nonce);
      return;
    }

    // 4. Xử lý Responses & Handshake confirmation
    if (frame.type === "res") {
      const id = typeof frame.id === "string" ? frame.id : "";
      // connect được gửi bằng sendConnect() — không có entry trong pending
      if (id.startsWith("auth-")) {
        if (frame.ok) {
          console.log("[GatewayWS] Handshake successful");
          this.authenticated = true;
          this.flushQueue();
        } else {
          console.error("[GatewayWS] Handshake FAILED:", frame.error);
        }
        const pendingAuth = this.pending.get(id);
        if (pendingAuth) {
          this.pending.delete(id);
          if (frame.ok) pendingAuth.resolve(frame.payload);
          else pendingAuth.reject(frame.error);
        }
        return;
      }

      const p = typeof frame.id === "string" ? this.pending.get(frame.id) : undefined;
      if (!p) return;
      this.pending.delete(frame.id as string);
      if (frame.ok) p.resolve(frame.payload);
      else p.reject(frame.error);
    }
  }

  private async sendConnect(nonce: string) {
    const token = this.opts?.token;
    const device = await buildGatewayDeviceAuth({ token, nonce }).catch((err) => {
      console.error("[GatewayWS] Không tạo được device auth cho gateway:", err);
      return undefined;
    });
    const payload = {
      type: "req",
      id: "auth-" + Math.random().toString(36).substring(7),
      method: "connect",
      params: {
        minProtocol: 3,
        maxProtocol: 3,
        client: {
          id: GATEWAY_CLIENT_ID,
          version: "2026.4.15", 
          platform: "web", 
          mode: GATEWAY_CLIENT_MODE,
        },
        role: GATEWAY_ROLE,
        caps: ["tool-events"],
        // operator.write: send / chat… — operator.admin: channels.logout, web.login.* (method-scopes)
        scopes: GATEWAY_SCOPES,
        auth: token ? { token } : undefined,
        device,
      }
    };
    console.log("[GatewayWS] Sending signed connect payload...");
    this.ws?.send(JSON.stringify(payload));
  }

  async request<T = unknown>(method: string, params: unknown = {}): Promise<T> {
    // Chỉ cho phép gửi request thật sự khi đã Authenticated
    if (!this.authenticated) {
      console.log("[GatewayWS] Queuing request (waiting for auth):", method);
      return new Promise<T>((resolve, reject) => {
        this.queue.push({ method, params, resolve: resolve as (value: unknown) => void, reject });
      });
    }
    
    const id = Math.random().toString(36).substring(7);
    const frame = { type: "req", id, method, params };
    
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject });
      this.ws?.send(JSON.stringify(frame));
    });
  }

  close() {
    this.disconnect();
  }
}

export const gatewayWs = new GatewayWsManager();

/** Key cho RPC `send` / `message.action` (OpenClaw gateway). */
export function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Helper để gửi tin nhắn chat qua WebSocket
 */
export async function sendChatMessage(params: {
  message: string;
  sessionKey?: string;
  /** Mỗi tin user nên có key riêng; có thể truyền để retry an toàn */
  idempotencyKey?: string;
}) {
  return gatewayWs.request("chat.send", {
    sessionKey: params.sessionKey || "agent:main:main",
    message: params.message,
    deliver: true,
    idempotencyKey: params.idempotencyKey ?? newIdempotencyKey(),
  });
}

export { getPublicGatewayAuthToken } from "./env";
