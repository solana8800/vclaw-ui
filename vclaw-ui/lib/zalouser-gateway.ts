/**
 * RPC OpenClaw gateway qua WebSocket (browser) — kênh Zalo Personal (`zalouser`).
 * Cần `gatewayWs` đã connect + authenticated trước khi gọi.
 */
import { gatewayWs, newIdempotencyKey } from "@/lib/gateway-client";

export const OPENCLAW_ZALOUSER_CHANNEL = "zalouser" as const;

export async function openclawChannelsStatusProbe() {
  return gatewayWs.request("channels.status", { probe: true, timeoutMs: 20_000 });
}

export async function openclawChannelsLogoutZalouser(accountId?: string) {
  return gatewayWs.request("channels.logout", {
    channel: OPENCLAW_ZALOUSER_CHANNEL,
    accountId,
  });
}

/** Một số bản gateway hỗ trợ đăng nhập kênh qua web — gọi thử trước khi fallback API máy chủ. */
export async function openclawWebLoginStart(opts?: { force?: boolean }) {
  return gatewayWs.request("web.login.start", { force: opts?.force ?? true });
}

export async function openclawSessionsSubscribe() {
  return gatewayWs.request("sessions.subscribe", {});
}

export async function openclawSessionsListForZalouser(opts?: { limit?: number }) {
  return gatewayWs.request("sessions.list", {
    limit: opts?.limit ?? 100,
    search: "zalouser",
    includeDerivedTitles: true,
    includeLastMessage: true,
  });
}

export async function openclawSessionsMessagesSubscribe(sessionKey: string) {
  return gatewayWs.request("sessions.messages.subscribe", { key: sessionKey });
}

export async function openclawSessionsMessagesUnsubscribe(sessionKey: string) {
  return gatewayWs.request("sessions.messages.unsubscribe", { key: sessionKey });
}

export async function openclawSendZalouserDm(input: {
  to: string;
  message: string;
  accountId?: string;
  sessionKey?: string;
}) {
  return gatewayWs.request("send", {
    to: input.to.trim(),
    message: input.message,
    channel: OPENCLAW_ZALOUSER_CHANNEL,
    accountId: input.accountId,
    sessionKey: input.sessionKey,
    idempotencyKey: newIdempotencyKey(),
  });
}
