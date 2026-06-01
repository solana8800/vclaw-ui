import {
  messageDirectionFromLinkedInId,
} from "@/lib/recruitment/linkedin-message-direction";

export type LinkedInChatMessage = {
  id: string;
  text: string;
  sentAt: string | null;
  direction: "inbound" | "outbound" | "unknown";
  senderLabel?: string | null;
};

export { refineChatMessageDirections } from "@/lib/recruitment/linkedin-message-direction";

type RawMsg = Record<string, unknown>;

function pickString(obj: RawMsg, keys: string[]): string | undefined {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

function messageText(raw: RawMsg): string {
  const direct = pickString(raw, [
    "text",
    "body",
    "content",
    "message",
    "messageText",
    "message_text",
  ]);
  if (direct) return direct;
  const nested = raw.message;
  if (nested && typeof nested === "object") {
    return pickString(nested as RawMsg, ["text", "body", "content"]) ?? "";
  }
  return "";
}

function extractSenderLabel(raw: RawMsg): string | null {
  const direct = pickString(raw, [
    "senderName",
    "sender_name",
    "authorName",
    "author_name",
    "fromName",
    "from_name",
  ]);
  if (direct) return direct;
  const sender = raw.sender ?? raw.author ?? raw.from;
  if (sender && typeof sender === "object") {
    return (
      pickString(sender as RawMsg, [
        "name",
        "displayName",
        "display_name",
        "fullName",
        "full_name",
      ]) ?? null
    );
  }
  if (typeof sender === "string" && sender.trim()) return sender.trim();
  return null;
}

function messageDirection(raw: RawMsg): LinkedInChatMessage["direction"] {
  const flags = [
    raw.isOutgoing,
    raw.outgoing,
    raw.fromMe,
    raw.is_from_me,
    raw.sentByMe,
    raw.isFromMe,
    raw.isSender,
    raw.is_sender,
    raw.incoming === false ? true : raw.incoming === true ? false : undefined,
    raw.isInbound === true ? false : raw.isInbound === false ? true : undefined,
  ];
  for (const f of flags) {
    if (f === true) return "outbound";
    if (f === false) return "inbound";
  }

  const nestedSender = raw.sender;
  if (nestedSender && typeof nestedSender === "object") {
    const s = nestedSender as RawMsg;
    if (s.isMe === true || s.is_me === true || s.self === true) return "outbound";
    if (s.isMe === false || s.is_me === false) return "inbound";
  }

  const side = String(raw.side ?? raw.alignment ?? "").trim().toLowerCase();
  if (side === "right" || side === "outgoing" || side === "sent") return "outbound";
  if (side === "left" || side === "incoming" || side === "received") return "inbound";

  const sender = String(raw.sender ?? raw.from ?? raw.direction ?? raw.role ?? "")
    .trim()
    .toLowerCase();
  if (!sender) return "unknown";
  if (["me", "self", "recruiter", "outbound", "outgoing"].includes(sender)) return "outbound";
  if (["them", "candidate", "contact", "participant", "inbound", "incoming"].includes(sender)) {
    return "inbound";
  }
  return "unknown";
}

function messageSentAt(raw: RawMsg): string | null {
  const v =
    raw.sentAt ??
    raw.sent_at ??
    raw.createdAt ??
    raw.created_at ??
    raw.timestamp ??
    raw.time;
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) {
    return new Date(v > 1e12 ? v : v * 1000).toISOString();
  }
  const s = String(v).trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toISOString();
}

function normalizeOne(raw: unknown, index: number): LinkedInChatMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as RawMsg;
  const text = messageText(row);
  if (!text) return null;
  const id =
    pickString(row, ["id", "messageId", "message_id", "_id"]) ?? `msg-${index}`;
  const fromLinkedInId = id ? messageDirectionFromLinkedInId(id) : null;
  const direction = fromLinkedInId ?? messageDirection(row);
  return {
    id,
    text,
    sentAt: messageSentAt(row),
    direction,
    senderLabel: extractSenderLabel(row),
  };
}

function extractMessageArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  const obj = payload as Record<string, unknown>;
  for (const key of ["messages", "data", "items", "thread", "conversation"]) {
    const v = obj[key];
    if (Array.isArray(v)) return v;
    if (v && typeof v === "object") {
      const nested = extractMessageArray(v);
      if (nested.length > 0) return nested;
    }
  }
  return [];
}

/** Chuẩn hóa danh sách tin nhắn từ response API LinkedIn / CDP. */
export function extractLinkedInChatMessages(payload: unknown): LinkedInChatMessage[] {
  const list = extractMessageArray(payload);
  const out: LinkedInChatMessage[] = [];
  list.forEach((item, i) => {
    const msg = normalizeOne(item, i);
    if (msg) out.push(msg);
  });
  return out;
}

/** Parse conversationHistory JSON đã lưu trong DB. */
export function parseStoredChatHistory(
  conversationHistory?: string | null,
): LinkedInChatMessage[] {
  const raw = conversationHistory?.trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return extractLinkedInChatMessages(parsed);
  } catch {
    return [];
  }
}
