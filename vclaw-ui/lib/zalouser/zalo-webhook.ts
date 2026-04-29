import { createHmac, timingSafeEqual } from "node:crypto";

import { PILOT_CHANNEL_PROVIDER } from "@/lib/channel/pilot";
import { ingestInboundChannelMessage } from "@/lib/channel/ingest";

type ZaloWebhookBody = Record<string, unknown>;

function pickString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function pickNested(obj: unknown, path: string[]): unknown {
  let cur: unknown = obj;
  for (const k of path) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur;
}

/**
 * Xác minh chữ ký webhook (khi Zalo gửi header hoặc body.mac — tùy phiên bản API).
 * Nếu `ZALO_OA_WEBHOOK_SECRET` không đặt → chỉ dùng cho dev nội bộ.
 */
export function verifyZaloWebhookSignature(
  secret: string | undefined,
  rawBody: string,
  headers: Headers,
): { ok: boolean; reason?: string } {
  if (process.env.ZALO_WEBHOOK_SKIP_VERIFY === "1") {
    return { ok: true, reason: "skip_verify" };
  }
  if (!secret) {
    return { ok: true, reason: "no_secret_dev_mode" };
  }
  const sig =
    headers.get("x-zalo-signature") ??
    headers.get("x-zevent-signature") ??
    headers.get("authorization");
  if (!sig) {
    return { ok: false, reason: "missing_signature" };
  }
  const mac = createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    const a = Buffer.from(mac, "utf8");
    const b = Buffer.from(sig.replace(/^sha256=/, "").trim(), "utf8");
    if (a.length !== b.length) return { ok: false, reason: "sig_mismatch" };
    if (!timingSafeEqual(a, b)) return { ok: false, reason: "sig_mismatch" };
    return { ok: true };
  } catch {
    return { ok: false, reason: "sig_compare_error" };
  }
}

/**
 * Parse payload Zalo OA phổ biến: user_send_text, user_send_image (chỉ ghi text rỗng + note).
 */
export async function handleZaloWebhookJson(body: ZaloWebhookBody, rawJson: string) {
  const eventName = pickString(body.event_name) ?? pickString(body["eventName"]);
  const senderId =
    pickString(pickNested(body, ["sender", "id"])) ??
    pickString(pickNested(body, ["user_id"])) ??
    pickString(body.sender_id);

  if (!senderId) {
    return { handled: false as const, reason: "no_sender" };
  }

  if (eventName === "user_send_text" || eventName === "oa_send_text") {
    const text =
      pickString(pickNested(body, ["message", "text"])) ??
      pickString(pickNested(body, ["message", "msg"])) ??
      "";
    await ingestInboundChannelMessage({
      provider: PILOT_CHANNEL_PROVIDER,
      externalThreadId: senderId,
      titleHint: pickString(pickNested(body, ["sender", "name"])),
      body: text || "(empty)",
      externalMessageId: pickString(pickNested(body, ["message", "msg_id"])),
      rawPayloadJson: rawJson,
    });
    return { handled: true as const };
  }

  if (eventName === "user_send_image") {
    await ingestInboundChannelMessage({
      provider: PILOT_CHANNEL_PROVIDER,
      externalThreadId: senderId,
      titleHint: pickString(pickNested(body, ["sender", "name"])),
      body: "[Image]",
      externalMessageId: pickString(pickNested(body, ["message", "msg_id"])),
      rawPayloadJson: rawJson,
    });
    return { handled: true as const };
  }

  if (eventName === "follow" || eventName === "unfollow" || eventName === "user_received_message") {
    return { handled: true as const, noop: true };
  }

  return { handled: false as const, reason: `event:${eventName ?? "unknown"}` };
}
