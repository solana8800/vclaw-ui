import type { LinxaChatMessage } from "@/lib/recruitment/linxa-message-map";

/** Suffix trong id tin (sau decode base64) — xác minh trên API Linxa thực tế. */
const LINXA_OUTBOUND_SUFFIXES = new Set(["001", "003"]);
const LINXA_INBOUND_SUFFIXES = new Set(["002", "004"]);

function decodeLinxaMessageIdPart(messageId: string): string | null {
  const encoded = messageId.split("&", 1)[0]?.replace(/^2-/, "").trim();
  if (!encoded) return null;
  try {
    return Buffer.from(encoded, "base64").toString("utf8");
  } catch {
    return null;
  }
}

/** Đọc hướng tin từ id Linxa (001/003 = mình gửi, 002/004 = đối phương). */
export function messageDirectionFromLinxaId(
  messageId: string,
): LinxaChatMessage["direction"] | null {
  const decoded = decodeLinxaMessageIdPart(messageId);
  if (!decoded) return null;
  const part = decoded.split("&", 1)[0] ?? "";
  const suffix = part.split("-").pop()?.trim() ?? "";
  if (LINXA_OUTBOUND_SUFFIXES.has(suffix)) return "outbound";
  if (LINXA_INBOUND_SUFFIXES.has(suffix)) return "inbound";
  return null;
}

/** Heuristic khi suffix = 100 hoặc API không có cờ — bổ sung sau parse id. */
export function inferLinxaDirectionFromText(
  text: string,
  candidateName?: string,
): LinxaChatMessage["direction"] | null {
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

export function refineLinxaMessageDirections(
  messages: LinxaChatMessage[],
  candidateName: string,
): LinxaChatMessage[] {
  const norm = (s: string) => s.trim().toLowerCase();
  const cand = norm(candidateName);

  return messages.map((m) => {
    if (m.direction === "outbound" || m.direction === "inbound") return m;

    const fromText = inferLinxaDirectionFromText(m.text, candidateName);
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
