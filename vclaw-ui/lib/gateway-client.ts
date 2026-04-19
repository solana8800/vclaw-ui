/**
 * Gateway client — browser / 'use client'
 *
 * REST calls go through Next.js route handler /api/gateway/* so that
 * middleware (auth tokens, logging) can intercept them uniformly.
 *
 * WebSocket connects directly to the gateway on localhost — no proxy
 * needed since this is a local desktop app (no CORS restriction).
 */

const API_BASE = "/api/gateway";
const WS_GATEWAY = "ws://127.0.0.1:18789";

// ── REST helpers ──────────────────────────────────────────────────────────────

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

  /** SSE stream — returns an AsyncGenerator yielding parsed JSON lines */
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
  /** Gateway WebSocket path, e.g. "/ws" or "/ws/chat" */
  path?: string;
  onMessage: (data: unknown) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (e: Event) => void;
  /** Auto-reconnect interval in ms (0 = disabled). Default: 3000 */
  reconnectMs?: number;
};

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
    ws = new WebSocket(`${WS_GATEWAY}${path}`)

    ws.onopen = () => onOpen?.()

    ws.onmessage = (evt) => {
      try {
        onMessage(JSON.parse(evt.data))
      } catch {
        onMessage(evt.data)
      }
    }

    ws.onerror = (e) => onError?.(e)

    ws.onclose = () => {
      onClose?.()
      if (!stopped && reconnectMs > 0) {
        setTimeout(connect, reconnectMs)
      }
    }
  }

  connect()

  // Returns a cleanup function — call it in useEffect cleanup
  return () => {
    stopped = true
    ws?.close()
  }
}
