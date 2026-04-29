import type { GatewayWsSessionMessagePayload } from "@/lib/gateway/client";

type ZalouserChatBubbleSide = "them" | "you" | "staff" | "note";


export function cleanZaloBody(text: string): string {
  if (!text) return "";
  
  let cleaned = text;

  // 1. Loại bỏ các khối metadata và JSON kỹ thuật (bất kể định dạng nào)
  cleaned = cleaned
    .replace(/(?:User:\s+)?Conversation info \(untrusted metadata\):[\s\S]*?```(?:json)?[\s\S]*?```/gi, "")
    .replace(/(?:User:\s+)?Sender \(untrusted metadata\):[\s\S]*?```(?:json)?[\s\S]*?```/gi, "")
    .replace(/```(?:json)?[\s\S]*?```/gi, "") // Xóa mọi khối JSON/code còn sót lại
    .trim();

  // 2. Nhận diện URL Sticker Zalo trong nội dung đã làm sạch
  if (/zalo-api\.zadn\.vn\/api\/emoticon\/sticker/i.test(cleaned)) {
    return "(Khách hàng vừa gửi một Sticker biểu cảm.)";
  }

  return cleaned.replace(/\s+/g, " ").trim();
}

function extractTextFromContent(content: unknown): string {
  if (typeof content === "string") return cleanZaloBody(content);
  if (!Array.isArray(content)) return "";
  let out = "";
  for (const block of content) {
    if (!block || typeof block !== "object") continue;
    const t = (block as { text?: unknown }).text;
    if (typeof t === "string") out += t;
  }
  return cleanZaloBody(out);
}

/** Lấy nội dung hiển thị + phía hội thoại từ payload session.message của gateway. */
export function parseSessionMessageBubble(
  payload: GatewayWsSessionMessagePayload,
  selfAccountId?: string | null,
): { text: string; side: ZalouserChatBubbleSide } {
  const msg = payload.message;
  if (msg && typeof msg === "object") {
    const m = msg as {
      role?: unknown;
      content?: unknown;
      text?: unknown;
      from?: unknown;
      senderId?: unknown;
      userId?: unknown;
      fromMe?: unknown;
      data?: unknown;
    };

    const role = typeof m.role === "string" ? m.role.toLowerCase() : "";
    let text = extractTextFromContent(m.content);
    if (!text && typeof m.text === "string") text = cleanZaloBody(m.text);

    // NHẬN DIỆN STICKER: Nếu không có text nhưng có data (catId, id) thì đó là sticker Zalo
    if (!text && m.data && typeof m.data === "object") {
      const d = m.data as Record<string, unknown>;
      if (d.catId !== undefined && d.id !== undefined) {
        text = "(Khách hàng vừa gửi một Sticker biểu cảm rất dễ thương.)";
      }
    }

    if (text.trim()) {
      if (role === "staff" || role === "admin") return { text: text.trim(), side: "staff" };
      const senderId = String(m.senderId || m.from || m.userId || "").trim();
      const isSelfBot = m.fromMe === true || (selfAccountId && senderId === selfAccountId) || role === "assistant" || role === "model" || role === "tool";
      if (isSelfBot) return { text: text.trim(), side: "you" };
      return { text: text.trim(), side: "them" };
    }

    // Nếu không có text nhưng là role assistant/model/tool, đây có thể là tín hiệu dừng hoặc tool call, nên bỏ qua
    if (role === "assistant" || role === "model" || role === "tool") {
      return { text: "", side: "note" };
    }
  }

  // Chỉ ghi log/note cho những payload thực sự lạ mà không có cấu trúc message rõ ràng
  try {
    const raw = JSON.stringify(payload);
    
    // LOẠI BỎ TIN NHẮN HỆ THỐNG/KỸ THUẬT: stopReason, usage, api, model... không nên đưa vào hội thoại
    if (raw.includes('"stopReason":') || raw.includes('"usage":') || raw.includes('"api":') || raw.includes('"model":')) {
      return { text: "", side: "note" };
    }

    // Nếu là payload rỗng hoặc chỉ có sessionKey mà không có content hữu ích, trả về rỗng
    if (raw.includes('"content":[]') && raw.includes('"role":"assistant"')) return { text: "", side: "note" };
    
    return { text: raw.slice(0, 4000), side: "note" };
  } catch {
    return { text: String(payload), side: "note" };
  }
}

