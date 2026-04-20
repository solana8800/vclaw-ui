/**
 * Gateway client — browser / 'use client'
 *
 * REST/MCP calls go through Next.js route handler /api/gateway/* so that
 * middleware (auth tokens, logging) can intercept them uniformly.
 *
 * WebSocket connects trực tiếp tới gateway trên localhost.
 */

const API_BASE = "/api/gateway";
const WS_GATEWAY = "ws://127.0.0.1:18789";

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

export type GatewayWsOptions = {
  path?: string;
  onMessage: (data: unknown) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (e: Event) => void;
  reconnectMs?: number;
};

/**
 * Kết nối WebSocket tới OpenClaw Core để nhận sự kiện real-time.
 */
export function connectGatewayWs(opts: GatewayWsOptions): () => void {
  const {
    path = "/ws",
    onMessage,
    onOpen,
    onClose,
    onError,
    reconnectMs = 3000,
  } = opts;

  let ws: WebSocket | null = null;
  let stopped = false;

  function connect() {
    if (stopped) return;
    
    // Lưu ý: Core có thể yêu cầu challenge, nhưng Dashboard local thường được pass.
    ws = new WebSocket(`${WS_GATEWAY}${path}`);

    ws.onopen = () => {
      console.log("[GatewayWS] Connected");
      onOpen?.();
    };

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        
        // Tự động phản hồi challenge nếu có (theo protocol core)
        if (data.event === "connect.challenge") {
          ws?.send(JSON.stringify({
            type: "response",
            id: data.id,
            payload: { success: true }
          }));
          return;
        }

        onMessage(data);
      } catch (e) {
        onMessage(evt.data);
      }
    };

    ws.onerror = (e) => {
      console.error("[GatewayWS] Error:", e);
      onError?.(e);
    };

    ws.onclose = () => {
      console.log("[GatewayWS] Closed");
      onClose?.();
      if (!stopped && reconnectMs > 0) {
        setTimeout(connect, reconnectMs);
      }
    };
  }

  connect();

  return () => {
    stopped = true;
    ws?.close();
  };
}
