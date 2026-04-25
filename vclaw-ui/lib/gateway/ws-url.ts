const DEFAULT_GATEWAY_HTTP = "http://127.0.0.1:18789";

/**
 * URL WebSocket tới OpenClaw gateway (browser).
 * Mặc định khớp OPENCLAW_GATEWAY_URL mặc định (18789). Với OpenClaw Zero Token
 * thường đổi cổng (vd 3001) — đặt NEXT_PUBLIC_OPENCLAW_GATEWAY_WS_URL.
 */
export function getGatewayWebSocketUrl(path = "/ws"): string {
  const configured = process.env.NEXT_PUBLIC_OPENCLAW_GATEWAY_WS_URL?.trim();
  if (configured) {
    const base = configured.replace(/\/$/, "");
    if (base.endsWith("/ws")) return base;
    const suffix = path.startsWith("/") ? path : `/${path}`;
    return `${base}${suffix}`;
  }
  const host = "127.0.0.1:18789";
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `ws://${host}${suffix}`;
}

/**
 * URL WS cho Node (Server Actions): OPENCLAW_GATEWAY_WS_URL / NEXT_PUBLIC_*,
 * hoặc suy ra từ OPENCLAW_GATEWAY_URL (http→ws).
 */
export function resolveGatewayWebSocketUrlForServer(path = "/ws"): string {
  const explicit =
    process.env.OPENCLAW_GATEWAY_WS_URL?.trim() ||
    process.env.NEXT_PUBLIC_OPENCLAW_GATEWAY_WS_URL?.trim();
  if (explicit) {
    const base = explicit.replace(/\/$/, "");
    if (base.endsWith("/ws")) return base;
    const suffix = path.startsWith("/") ? path : `/${path}`;
    return `${base}${suffix}`;
  }
  const httpUrl = process.env.OPENCLAW_GATEWAY_URL?.trim() || DEFAULT_GATEWAY_HTTP;
  try {
    const u = new URL(httpUrl);
    const wsProto = u.protocol === "https:" ? "wss:" : "ws:";
    const suffix = path.startsWith("/") ? path : `/${path}`;
    return `${wsProto}//${u.host}${suffix}`;
  } catch {
    return getGatewayWebSocketUrl(path);
  }
}
