import type { LinkedInChatMessage } from "@/lib/recruitment/linkedin-chat-message";

/** Suffix trong id tin (sau decode base64) — xác minh từ LinkedIn Message API thực tế. */
const LINKEDIN_OUTBOUND_SUFFIXES = new Set(["001", "003"]);
const LINKEDIN_INBOUND_SUFFIXES = new Set(["002", "004"]);

function decodeLinkedInMessageIdPart(messageId: string): string | null {
  const encoded = messageId.split("&", 1)[0]?.replace(/^2-/, "").trim();
  if (!encoded) return null;
  try {
    return Buffer.from(encoded, "base64").toString("utf8");
  } catch {
    return null;
  }
}

/** Đọc hướng tin từ id LinkedIn message (001/003 = mình gửi, 002/004 = đối phương). */
export function messageDirectionFromLinkedInId(
  messageId: string,
): LinkedInChatMessage["direction"] | null {
  const decoded = decodeLinkedInMessageIdPart(messageId);
  if (!decoded) return null;
  const part = decoded.split("&", 1)[0] ?? "";
  const suffix = part.split("-").pop()?.trim() ?? "";
  if (LINKEDIN_OUTBOUND_SUFFIXES.has(suffix)) return "outbound";
  if (LINKEDIN_INBOUND_SUFFIXES.has(suffix)) return "inbound";
  return null;
}

/** Heuristic khi suffix = 100 hoặc API không có cờ — bổ sung sau parse id. */
export function inferChatDirectionFromText(
  text: string,
  candidateName?: string,
): LinkedInChatMessage["direction"] | null {
  const t = text.trim().toLowerCase();
  if (!t) return null;

  if (
    /\b(mình gửi|mình gui|em gửi|em gui|gửi (bạn|anh|chị) jd|gui (bạn|anh|chị) jd|gửi bạn jd|nhắn tin kết bạn|đặt lịch hẹn|app này anh|anh code|để local|tự chát với ứng viên|câu lệnh tạo tool|can i have your skype|are you the expert)\b/i.test(
      text,
    ) ||
    /^(hi,?\s+great to connect|really great to connect|hi bạn! hiện)/i.test(text) ||
    /\b(we have created|my rtc team)\b/i.test(t)
  ) {
    return "outbound";
  }

  if (
    /\b(hii em|em làm gì|em e k|e đang cháy|ợ ợ|có link nào|gì thế anh|ý tưởng hay đó)\b/i.test(
      text,
    ) ||
    /^(yeah|sure|i'm interested|my skype:)/i.test(t) ||
    /^k\.?$/i.test(t) ||
    /\b(dạ anh|vâng ạ)\b/i.test(t)
  ) {
    return "inbound";
  }

  const cand = candidateName?.trim().toLowerCase();
  if (cand && t.includes(cand.split(/\s+/)[0] ?? "")) {
    return "inbound";
  }

  return null;
}

export function refineChatMessageDirections(
  messages: LinkedInChatMessage[],
  candidateName: string,
): LinkedInChatMessage[] {
  const norm = (s: string) => s.trim().toLowerCase();
  const cand = norm(candidateName);

  return messages.map((m) => {
    if (m.direction === "outbound" || m.direction === "inbound") return m;

    const fromText = inferChatDirectionFromText(m.text, candidateName);
    if (fromText) return { ...m, direction: fromText };

    const label = m.senderLabel ? norm(m.senderLabel) : "";
    if (label && cand && (label === cand || cand.includes(label) || label.includes(cand))) {
      return { ...m, direction: "inbound" };
    }
    if (
      label &&
      ["me", "self", "you", "recruiter", "tôi", "toi", "mình", "minh", "tuan"].some((k) =>
        label.includes(k),
      )
    ) {
      return { ...m, direction: "outbound" };
    }

    return m;
  });
}
