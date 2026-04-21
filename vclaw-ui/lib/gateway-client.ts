/**
 * Gateway client — browser / 'use client'
 *
 * REST/MCP calls go through Next.js route handler /api/gateway/* so that
 * middleware (auth tokens, logging) can intercept them uniformly.
 *
 * WebSocket connects trực tiếp tới gateway trên localhost.
 */

import { getGatewayWebSocketUrl } from "@/lib/gateway-ws-url";

const API_BASE = "/api/gateway";

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

export type GatewayWsOptions = {
  path?: string;
  token?: string;
  onChatDelta?: (delta: string) => void;
  onAgentEvent?: (payload: any) => void;
  onChatDone?: () => void;
  /** Tin mới trong session (sau sessions.messages.subscribe). */
  onSessionMessage?: (payload: GatewayWsSessionMessagePayload) => void;
  onSessionsChanged?: (payload: unknown) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (e: Event) => void;
};

/**
 * Quản lý kết nối WebSocket tới OpenClaw Core.
 */
class GatewayWsManager {
  private ws: WebSocket | null = null;
  private pending = new Map<string, { resolve: (v: any) => void, reject: (e: any) => void }>();
  private queue: Array<{ method: string, params: any, resolve: any, reject: any }> = [];
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
      console.error("[GatewayWS] Error:", e);
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

  private handleFrame(frame: any) {
    // 1. Xử lý Challenge (Nonce) từ Server
    if (frame.type === "event" && frame.event === "connect.challenge") {
      console.log("[GatewayWS] Received challenge, sending connect...");
      this.sendConnect();
      return;
    }

    // 2. Xử lý Agent Event (Thinking mượt mà, Tool usage) - Quan trọng cho UX
    if (frame.type === "event" && frame.event === "agent") {
      const p = frame.payload;
      this.opts?.onAgentEvent?.(p);
      
      // Nếu là assistant stream, forward delta về UI
      if (p.stream === "assistant" && p.data?.delta) {
        this.opts?.onChatDelta?.(p.data.delta);
      }
      return;
    }

    // 3. Xử lý Chat Event (Streaming delta & Final state)
    if (frame.type === "event" && frame.event === "chat") {
      const payload = frame.payload;
      if (payload.state === "delta") {
        this.opts?.onChatDelta?.(payload.message?.content?.[0]?.text || "");
      } else if (payload.state === "final" || payload.state === "done") {
        this.opts?.onChatDone?.();
      }
      return;
    }

    if (frame.type === "event" && frame.event === "session.message") {
      const payload = frame.payload as GatewayWsSessionMessagePayload | undefined;
      if (payload) this.opts?.onSessionMessage?.(payload);
      return;
    }

    if (frame.type === "event" && frame.event === "sessions.changed") {
      this.opts?.onSessionsChanged?.(frame.payload);
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

      const p = this.pending.get(frame.id);
      if (!p) return;
      this.pending.delete(frame.id);
      if (frame.ok) p.resolve(frame.payload);
      else p.reject(frame.error);
    }
  }

  private sendConnect() {
    const payload = {
      type: "req",
      id: "auth-" + Math.random().toString(36).substring(7),
      method: "connect",
      params: {
        minProtocol: 3,
        maxProtocol: 3,
        client: { 
          id: "openclaw-control-ui", 
          version: "2026.4.15", 
          platform: "web", 
          mode: "webchat" 
        },
        role: "operator",
        caps: ["tool-events"],
        // Gateway default-deny: không gửi scopes → không quyền gọi chat.send (cần operator.write)
        scopes: ["operator.read", "operator.write"],
        auth: this.opts?.token ? { 
          token: this.opts?.token 
        } : undefined
        // device: undefined - Đã bật dangerouslyDisableDeviceAuth: true trong openclaw.json
      }
    };
    console.log("[GatewayWS] Sending minimized connect payload...");
    this.ws?.send(JSON.stringify(payload));
  }

  async request(method: string, params: any = {}): Promise<any> {
    // Chỉ cho phép gửi request thật sự khi đã Authenticated
    if (!this.authenticated) {
      console.log("[GatewayWS] Queuing request (waiting for auth):", method);
      return new Promise((resolve, reject) => {
        this.queue.push({ method, params, resolve, reject });
      });
    }
    
    const id = Math.random().toString(36).substring(7);
    const frame = { type: "req", id, method, params };
    
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
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

export { getPublicGatewayAuthToken } from "./gateway-env";
