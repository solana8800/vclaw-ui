/**
 * RPC OpenClaw gateway qua WebSocket (browser) — kênh Zalo Personal (`zalouser`).
 * Cần `gatewayWs` đã connect + authenticated trước khi gọi.
 */
import { gatewayWs } from "@/lib/gateway/client";

/** QR login qua gateway (`web.login.*`). Chỉ định kênh qua config plugin (chỉ bật zalouser) hoặc thứ tự provider. */
export async function openclawWebLoginStart(opts?: {
  force?: boolean;
  timeoutMs?: number;
  verbose?: boolean;
}) {
  return gatewayWs.request("web.login.start", {
    force: opts?.force ?? true,
    ...(typeof opts?.timeoutMs === "number" ? { timeoutMs: opts.timeoutMs } : {}),
    ...(opts?.verbose ? { verbose: true } : {}),
  }, opts?.timeoutMs ? opts.timeoutMs + 5000 : 30000);
}

/** Poll chờ quét QR (`web.login.wait`). */
export async function openclawWebLoginWait(opts?: { timeoutMs?: number }) {
  return gatewayWs.request("web.login.wait", {
    ...(typeof opts?.timeoutMs === "number" ? { timeoutMs: opts.timeoutMs } : {}),
  }, opts?.timeoutMs ? opts.timeoutMs + 5000 : 65000);
}

export async function openclawSessionsMessagesSubscribe(sessionKey: string) {
  return gatewayWs.request("sessions.messages.subscribe", { key: sessionKey });
}

export async function openclawSessionsMessagesUnsubscribe(sessionKey: string) {
  return gatewayWs.request("sessions.messages.unsubscribe", { key: sessionKey });
}
