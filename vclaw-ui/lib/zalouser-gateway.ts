/**
 * RPC OpenClaw gateway qua WebSocket (browser) — kênh Zalo Personal (`zalouser`).
 * Cần `gatewayWs` đã connect + authenticated trước khi gọi.
 */
import { gatewayWs, newIdempotencyKey } from "@/lib/gateway-client";

export const OPENCLAW_ZALOUSER_CHANNEL = "zalouser" as const;

export async function openclawChannelsStatusProbe() {
  return gatewayWs.request("channels.status", { probe: true, timeoutMs: 20_000 });
}

export async function openclawWebLoginStart(params?: { force?: boolean; accountId?: string }) {
  return gatewayWs.request("web.login.start", {
    force: params?.force === true,
    timeoutMs: 120_000,
    accountId: params?.accountId,
  });
}

export async function openclawWebLoginWait(params?: { accountId?: string }) {
  return gatewayWs.request("web.login.wait", {
    timeoutMs: 120_000,
    accountId: params?.accountId,
  });
}

export async function openclawChannelsLogoutZalouser(accountId?: string) {
  return gatewayWs.request("channels.logout", {
    channel: OPENCLAW_ZALOUSER_CHANNEL,
    accountId,
  });
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
