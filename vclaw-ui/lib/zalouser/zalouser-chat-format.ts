import type { GatewayWsSessionMessagePayload } from "@/lib/gateway/client";
import { sessionListRowKey, type SessionListEntry } from "@/lib/zalouser/zalouser-session-filters";

export type ZalouserChatBubbleSide = "them" | "you" | "staff" | "note";

export type ZalouserChatLine = {
  id: string;
  at: number;
  side: ZalouserChatBubbleSide;
  text: string;
};

function extractTextFromContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  let out = "";
  for (const block of content) {
    if (!block || typeof block !== "object") continue;
    const t = (block as { text?: unknown }).text;
    if (typeof t === "string") out += t;
  }
  return out;
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
    };

    const role = typeof m.role === "string" ? m.role.toLowerCase() : "";
    let text = extractTextFromContent(m.content);
    if (!text && typeof m.text === "string") text = m.text;

    if (text.trim()) {
      // 1. Nếu là Admin/Staff gửi từ UI
      if (role === "staff" || role === "admin") {
        return { text: text.trim(), side: "staff" };
      }

      // 2. Kiểm tra xem tin nhắn có phải từ Bot chính mình không
      const senderId = String(m.senderId || m.from || m.userId || "").trim();
      const isSelfBot =
        m.fromMe === true ||
        (selfAccountId && senderId === selfAccountId) ||
        role === "assistant" ||
        role === "model" ||
        role === "tool";

      if (isSelfBot) {
        return { text: text.trim(), side: "you" };
      }
      
      // 3. Nếu không phải mình gửi, thì mặc định là đối phương gửi (side: "them")
      return { text: text.trim(), side: "them" };
    }
  }
  try {
    return { text: JSON.stringify(payload).slice(0, 4000), side: "note" };
  } catch {
    return { text: String(payload), side: "note" };
  }
}

/** Tiêu đề hiển thị cho một hàng session (ưu tiên tên người/nhóm). */
export function sessionChatTitle(row: SessionListEntry): string {
  const candidates = [row.displayName, row.derivedTitle, row.title, row.label];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  const k = sessionListRowKey(row);
  if (!k) return "…";
  if (k.length <= 48) return k;
  return `${k.slice(0, 20)}…${k.slice(-12)}`;
}

/** Gợi ý người nhận khi gửi tin (user / nhóm) từ metadata session. */
export function guessSendTargetFromSession(row: SessionListEntry): string {
  if (typeof row.lastTo === "string" && row.lastTo.trim()) return row.lastTo.trim();
  const tid = row.lastThreadId;
  if (tid !== undefined && tid !== null) {
    const s = String(tid).trim();
    if (s) return s;
  }
  return "";
}
