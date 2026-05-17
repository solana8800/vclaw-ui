import { extractLinxaConversations, type LinxaConversationRaw } from "@/lib/recruitment/linxa-conversation-map";
import { LINXA_SUPPORTS_LINKEDIN_CONNECT } from "@/lib/recruitment/linxa-capabilities";

const LINXA_API_BASE = "https://app.uselinxa.com";

/** Linxa: đọc inbox — không gửi lời mời kết nối LinkedIn (dùng CDP). */
export { LINXA_SUPPORTS_LINKEDIN_CONNECT };

/** Gọi Linxa MCP API (token) — chỉ đọc inbox, phục vụ import và phân tích AI. */
export async function listLinxaConversations(
  token: string,
  limit = 30,
): Promise<
  | { ok: true; conversations: LinxaConversationRaw[] }
  | { ok: false; error: string }
> {
  try {
    const q = new URLSearchParams({ limit: String(limit) });
    const res = await fetch(`${LINXA_API_BASE}/api/mcp/conversations?${q}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return {
        ok: false,
        error: `Linxa trả về ${res.status}. Kiểm tra token tại Cài đặt tuyển dụng.`,
      };
    }

    const json: unknown = await res.json();
    const conversations = extractLinxaConversations(json);
    return { ok: true, conversations };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

async function linxaFetch(
  token: string,
  method: "GET" | "POST",
  apiPath: string,
  body?: unknown,
): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${LINXA_API_BASE}${apiPath}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text();
      const snippet = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
      return {
        ok: false,
        error: `Linxa ${res.status}: ${snippet || res.statusText}`,
      };
    }
    return { ok: true, data: await res.json() };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

export async function getLinxaMessages(token: string, chatId: string) {
  return linxaFetch(
    token,
    "GET",
    `/api/mcp/messages/${encodeURIComponent(chatId)}`,
  );
}

/** Gợi ý hành động AI từ Linxa (đọc-only, không gửi tin). */
export async function postLinxaNextActions(
  token: string,
  payload: { chatId: string; message?: string },
) {
  return linxaFetch(token, "POST", "/api/mcp/next-actions", payload);
}
