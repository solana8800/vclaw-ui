/**
 * RPC OpenClaw gateway qua WebSocket (browser) — kênh Zalo Personal (`zalouser`).
 * Cần `gatewayWs` đã connect + authenticated trước khi gọi.
 */
import { gatewayWs, newIdempotencyKey } from "@/lib/gateway/client";

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
  });
}

/** Poll chờ quét QR (`web.login.wait`). */
export async function openclawWebLoginWait(opts?: { timeoutMs?: number }) {
  return gatewayWs.request("web.login.wait", {
    ...(typeof opts?.timeoutMs === "number" ? { timeoutMs: opts.timeoutMs } : {}),
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

const IMAGE_URL_REGEX = /(https?:\/\/[^\s]+?\.(?:png|jpg|jpeg|gif|webp)(?:\?[^\s]*)?)/i;
const VIETQR_REGEX = /(https:\/\/img\.vietqr\.io\/image\/[^\s]+)/i;

export async function openclawSendZalouserDm(input: {
  to: string;
  message: string;
  mediaUrl?: string;
  accountId?: string;
  sessionKey?: string;
}) {
  const { message } = input;
  let { mediaUrl } = input;

  // Tự động bóc tách link ảnh nếu chưa có mediaUrl
  if (!mediaUrl) {
    const match = message.match(VIETQR_REGEX) || message.match(IMAGE_URL_REGEX);
    if (match) {
      mediaUrl = match[1];
      // Log để debug (tiếng Việt tự nhiên)
      console.log(`[Zalo Gateway] Đã phát hiện link ảnh, tự động chuyển sang chế độ Media: ${mediaUrl}`);
    }
  }

  return gatewayWs.request("send", {
    to: input.to.trim(),
    message: message,
    mediaUrl: mediaUrl,
    channel: OPENCLAW_ZALOUSER_CHANNEL,
    accountId: input.accountId,
    sessionKey: input.sessionKey,
    idempotencyKey: newIdempotencyKey(),
  });
}
