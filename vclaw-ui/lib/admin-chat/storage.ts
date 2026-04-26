export type AdminAiChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AdminAiChatConversation = {
  id: string;
  createdAt: number;
  updatedAt: number;
  messages: AdminAiChatMessage[];
  /** Session OpenClaw riêng theo hội thoại (chuẩn agent:main:…). */
  openclawSessionKey?: string;
};

export type AdminAiChatStoreV1 = {
  version: 1;
  activeId: string;
  conversations: AdminAiChatConversation[];
};

const STORAGE_KEY = "vclaw-admin-ai-chat-v1";
/** Giới hạn số hội thoại lưu trên trình duyệt */
export const ADMIN_AI_CHAT_MAX_CONVERSATIONS = 40;
const MAX_MESSAGES_PER_CONVERSATION = 250;

export function newConversationId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function defaultOpenclawSessionKey(conversationId: string): string {
  const slug = conversationId.replace(/-/g, "").slice(0, 12);
  return `agent:main:vclaw-zero-${slug}`;
}

function normalizeOpenclawSessionKey(conversationId: string, sessionKey: string): string {
  const trimmed = sessionKey.trim();
  if (trimmed.startsWith("agent:main:vclaw-ui-")) {
    return defaultOpenclawSessionKey(conversationId);
  }
  return trimmed || defaultOpenclawSessionKey(conversationId);
}

export function createEmptyConversation(): AdminAiChatConversation {
  const now = Date.now();
  const id = newConversationId();
  return {
    id,
    createdAt: now,
    updatedAt: now,
    messages: [],
    openclawSessionKey: defaultOpenclawSessionKey(id),
  };
}

export function conversationPreview(messages: AdminAiChatMessage[], untitled: string): string {
  const first = messages.find((m) => m.role === "user" && m.content.trim());
  if (!first) return untitled;
  const t = first.content.replace(/\s+/g, " ").trim();
  return t.length <= 48 ? t : `${t.slice(0, 45)}…`;
}

export function loadAdminAiChatStore(): AdminAiChatStoreV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const p = parsed as Record<string, unknown>;
    if (p.version !== 1) return null;
    if (typeof p.activeId !== "string" || !Array.isArray(p.conversations)) return null;
    const conversations: AdminAiChatConversation[] = [];
    for (const item of p.conversations) {
      if (!item || typeof item !== "object") continue;
      const c = item as Record<string, unknown>;
      if (typeof c.id !== "string") continue;
      const createdAt = typeof c.createdAt === "number" ? c.createdAt : Date.now();
      const updatedAt = typeof c.updatedAt === "number" ? c.updatedAt : createdAt;
      const msgs: AdminAiChatMessage[] = [];
      if (Array.isArray(c.messages)) {
        for (const m of c.messages) {
          if (!m || typeof m !== "object") continue;
          const msg = m as Record<string, unknown>;
          if (msg.role !== "user" && msg.role !== "assistant") continue;
          if (typeof msg.content !== "string") continue;
          msgs.push({ role: msg.role, content: msg.content });
        }
      }
      const openclawSessionKey =
        typeof c.openclawSessionKey === "string"
          ? normalizeOpenclawSessionKey(c.id, c.openclawSessionKey)
          : defaultOpenclawSessionKey(c.id);
      conversations.push({
        id: c.id,
        createdAt,
        updatedAt,
        messages: msgs.slice(-MAX_MESSAGES_PER_CONVERSATION),
        openclawSessionKey,
      });
    }
    if (conversations.length === 0) return null;
    let activeId = p.activeId as string;
    if (!conversations.some((c) => c.id === activeId)) {
      activeId = conversations[0]!.id;
    }
    return { version: 1, activeId, conversations };
  } catch {
    return null;
  }
}

export function saveAdminAiChatStore(store: AdminAiChatStoreV1): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = [...store.conversations]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, ADMIN_AI_CHAT_MAX_CONVERSATIONS)
      .map((c) => ({
        ...c,
        messages: c.messages.slice(-MAX_MESSAGES_PER_CONVERSATION),
      }));
    let activeId = store.activeId;
    if (!trimmed.some((c) => c.id === activeId) && trimmed[0]) {
      activeId = trimmed[0].id;
    }
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, activeId, conversations: trimmed }),
    );
  } catch {
    // quota / private mode
  }
}
