"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { MessageCircle, X, Send, User, RotateCcw, ChevronDown, Bot, Sparkles, Plus, Image as ImageIcon, Paperclip, Maximize2, Minimize2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  gatewayWs,
  sendChatMessage,
  getPublicGatewayAuthToken,
} from "@/lib/gateway/client";
import {
  matchAdminChatIntent,
  type AdminNavReplyKey,
} from "@/lib/admin-chat/intents";
import {
  ADMIN_AI_CHAT_MAX_CONVERSATIONS,
  conversationPreview,
  createEmptyConversation,
  defaultOpenclawSessionKey,
  loadAdminAiChatStore,
  saveAdminAiChatStore,
  type AdminAiChatConversation,
  type AdminAiChatMessage,
} from "@/lib/admin-chat/storage";
import { getLocaleHref, isSupportedLocale, type AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/shared";
import { UrlPreview } from "./url-preview";

import { composeAdminAssistantPrompt } from "@/lib/ai/prompts/admin-prompts";

type TranslateFn = (
  key: string,
  values?: Record<string, string | number | Date>,
) => string;

/** Trợ lý nổi trên trang admin — KHÔNG phải bot bán hàng Zalo (luồng đó qua gateway + /api/vclaw/enrich + enrichment). */
const NAV_PATH_REPLY_KEY: Record<string, string> = {
  "/admin/products": "replies.navSteps.products",
  "/admin/orders": "replies.navSteps.orders",
  "/admin/payments": "replies.navSteps.payments",
  "/admin/customers": "replies.navSteps.customers",
  "/admin/bookings": "replies.navSteps.bookings",
  "/admin/shipping": "replies.navSteps.shipping",
  "/admin/settings": "replies.navSteps.settings",
  "/admin/inbox": "replies.navSteps.inbox",
  "/admin/automation": "replies.navSteps.automation",
  "/admin/zalouser": "replies.navSteps.zalouser",
  "/admin/guide": "replies.navSteps.guide",
  "/admin/reports": "replies.navSteps.reports",
};


function toFriendlyAiError(t: TranslateFn, rawError: string): string {
  const lowered = rawError.toLowerCase();
  if (
    lowered.includes("quota") ||
    lowered.includes("rate limit") ||
    lowered.includes("credit") ||
    lowered.includes("429")
  ) {
    return t("errors.quota");
  }
  if (
    lowered.includes("context") ||
    lowered.includes("max tokens") ||
    lowered.includes("too many requests") ||
    lowered.includes("overloaded")
  ) {
    return t("errors.busy");
  }
  if (
    lowered.includes("timeout") ||
    lowered.includes("network") ||
    lowered.includes("econn") ||
    lowered.includes("fetch")
  ) {
    return t("errors.network");
  }
  return t("errors.generic");
}

function navAssistantReply(
  t: TranslateFn,
  reply?: AdminNavReplyKey,
  path?: string,
) {
  const base =
    reply === "navGuide" ? t("replies.navGuide") : t("replies.nav");
  const pathKey = path ? NAV_PATH_REPLY_KEY[path] : undefined;
  const step = pathKey ? t(pathKey) : t("replies.navSteps.default");
  return `${base}\n\n${step}`;
}

const SAFE_ADMIN_INTENT_PATHS = new Set([
  "/admin",
  "/admin/guide",
  "/admin/inbox",
  "/admin/products",
  "/admin/orders",
  "/admin/customers",
  "/admin/payments",
  "/admin/bookings",
  "/admin/shipping",
  "/admin/settings",
  "/admin/automation",
  "/admin/reports",
  "/admin/zalouser",
]);

export function AdminChatAssistant() {
  const t = useTranslations("admin.adminAssistant");
  const conversationsRef = useRef<AdminAiChatConversation[]>([]);
  const router = useRouter();
  const localeRaw = useLocale();
  const locale: AppLocale = isSupportedLocale(localeRaw) ? localeRaw : "vi";
  const gatewayToken = getPublicGatewayAuthToken();

  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [input, setInput] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [conversations, setConversations] = useState<AdminAiChatConversation[]>([]);
  const [activeId, setActiveId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [thought, setThought] = useState("");
  const [currentTool, setCurrentTool] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef(activeId);
  const streamingConversationIdRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  const messages = useMemo(
    () => conversations.find((c) => c.id === activeId)?.messages ?? [],
    [conversations, activeId],
  );

  const updateConversationMessages = useCallback(
    (conversationId: string, fn: (prev: AdminAiChatMessage[]) => AdminAiChatMessage[]) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId ? { ...c, messages: fn(c.messages), updatedAt: Date.now() } : c,
        ),
      );
    },
    [],
  );

  useEffect(() => {
    activeIdRef.current = activeId;
    conversationsRef.current = conversations;
  }, [activeId, conversations]);

  useEffect(() => {
    let cancelled = false;
    const existing = loadAdminAiChatStore();
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      if (existing) {
        const sorted = [...existing.conversations].sort((a, b) => b.updatedAt - a.updatedAt);
        setConversations(sorted);
        setActiveId(existing.activeId);
      } else {
        const c = createEmptyConversation();
        setConversations([c]);
        setActiveId(c.id);
      }
      setHydrated(true);
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!hydrated || !activeId || conversations.length === 0) return;
    const timer = window.setTimeout(() => {
      saveAdminAiChatStore({ version: 1, activeId, conversations });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [hydrated, activeId, conversations]);

  useEffect(() => {
    if (!gatewayToken) return;

    gatewayWs.connect({
      token: gatewayToken,
      onAgentEvent: (payload) => {
        const event = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
        const data = event.data && typeof event.data === "object" ? (event.data as Record<string, unknown>) : {};
        if (event.stream === "assistant" && data.phase === "start") {
          setThought(t("status.thinking"));
        } else if (event.stream === "tool") {
          const toolName = typeof data.name === "string" ? data.name : "";
          const phase = typeof data.phase === "string" ? data.phase : "";
          if (phase === "start") {
            setCurrentTool(`${t("status.usingTool")}: ${toolName}`);
          } else if (phase === "end") {
            setCurrentTool("");
          }
        }
      },
      onChatDelta: (delta) => {
        setThought("");
        const targetId = streamingConversationIdRef.current ?? activeIdRef.current;
        if (!targetId) return;
        updateConversationMessages(targetId, (prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === "assistant") {
            next[next.length - 1] = { role: "assistant", content: last.content + delta };
          }
          return next;
        });
      },
      onChatDone: () => {
        streamingConversationIdRef.current = null;
        setIsLoading(false);
        setThought("");
        setCurrentTool("");
      },
      onChatError: (message) => {
        const targetId = streamingConversationIdRef.current ?? activeIdRef.current;
        streamingConversationIdRef.current = null;
        setIsLoading(false);
        setThought("");
        setCurrentTool("");
        if (!targetId) return;
        updateConversationMessages(targetId, (prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          const content = toFriendlyAiError(t, message);
          if (last?.role === "assistant") {
            next[next.length - 1] = { role: "assistant", content };
            return next;
          }
          return [...next, { role: "assistant", content }];
        });
      },
    });

    return () => gatewayWs.close();
  }, [gatewayToken, t, updateConversationMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, thought, currentTool]);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || isUploading) return;

    setIsUploading(true);
    setThought(t("status.uploading"));

    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append("files", file));

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.urls) {
        setUploadedImages((prev) => {
          const combined = [...prev, ...data.urls];
          return Array.from(new Set(combined));
        });
        setThought(t("status.uploadSuccess", { count: data.urls.length }));
        setTimeout(() => setThought(""), 2000);
      } else {
        throw new Error(data.error || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      setThought(t("status.uploadError"));
      setTimeout(() => setThought(""), 3000);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSend = async (text?: string) => {
    const messageText = (text ?? input).trim();
    if (!messageText && uploadedImages.length === 0) return;
    if (isLoading) return;

    const convId = activeIdRef.current;
    if (!convId) return;

    let displayContent = messageText;
    if (uploadedImages.length > 0) {
      const imgMarkdown = uploadedImages.map(url => `![Image](${url})`).join("\n");
      displayContent = messageText ? `${messageText}\n\n${imgMarkdown}` : imgMarkdown;
    }

    const userMessage: AdminAiChatMessage = { 
      role: "user", 
      content: displayContent || "Tạo sản phẩm từ ảnh đính kèm" 
    };
    const intent = matchAdminChatIntent(messageText);

    if (intent?.kind === "nav") {
      const safePath = SAFE_ADMIN_INTENT_PATHS.has(intent.path) ? intent.path : "/admin";
      updateConversationMessages(convId, (prev) => [
        ...prev,
        userMessage,
        { role: "assistant", content: navAssistantReply(t, intent.reply, safePath) },
      ]);
      setInput("");
      router.push(getLocaleHref(locale, safePath));
      return;
    }

    if (intent?.kind === "help") {
      updateConversationMessages(convId, (prev) => [
        ...prev,
        userMessage,
        { role: "assistant", content: t("replies.help") },
      ]);
      setInput("");
      router.push(getLocaleHref(locale, "/admin/guide"));
      return;
    }

    if (!gatewayToken) {
      updateConversationMessages(convId, (prev) => [
        ...prev,
        userMessage,
        { role: "assistant", content: t("gatewayOffline") },
      ]);
      setInput("");
      return;
    }

    streamingConversationIdRef.current = convId;
    updateConversationMessages(convId, (prev) => [...prev, userMessage, { role: "assistant", content: "" }]);
    setInput("");
    setIsLoading(true);
    setThought(t("status.connecting"));

    try {
      const convMeta = conversationsRef.current.find((c) => c.id === convId);
      const sessionKey =
        convMeta?.openclawSessionKey?.trim() || defaultOpenclawSessionKey(convId);
      
      // Nếu có ảnh đã upload, thêm vào tin nhắn để AI bóc tách
      let finalMessage = messageText;
      if (uploadedImages.length > 0) {
        const imageContext = uploadedImages.map(url => `[ẢNH_SẢN_PHẨM]: ${window.location.origin}${url}`).join("\n");
        finalMessage = `${messageText}\n\n${imageContext}`;
        setUploadedImages([]); // Xóa danh sách ảnh sau khi gửi
      }

      console.info("[vclaw:adminAssistant]", "gateway.send", {
        path: window.location.pathname,
        msgLen: finalMessage.length,
      });

      await sendChatMessage({
        message: composeAdminAssistantPrompt(finalMessage, window.location.pathname),
        sessionKey,
      });
    } catch (error: unknown) {
      console.error("[vclaw:adminAssistant] send error:", error);
      streamingConversationIdRef.current = null;
      setIsLoading(false);
      setThought("");
      const errorMessage =
        error instanceof Error
          ? error.message
          : error &&
              typeof error === "object" &&
              "message" in error &&
              typeof (error as { message: unknown }).message === "string"
            ? (error as { message: string }).message
            : "";
      const userFacingError = toFriendlyAiError(t, errorMessage);
      const errTarget = convId;
      updateConversationMessages(errTarget, (prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "assistant") {
          next[next.length - 1] = {
            role: "assistant",
            content: userFacingError,
          };
          return next;
        }
        return [...next, { role: "assistant", content: userFacingError }];
      });
    }
  };

  const clearHistory = () => {
    const id = activeIdRef.current;
    if (!id) return;
    updateConversationMessages(id, () => []);
  };

  const addConversation = () => {
    const fresh = createEmptyConversation();
    setConversations((prev) => [fresh, ...prev].slice(0, ADMIN_AI_CHAT_MAX_CONVERSATIONS));
    setActiveId(fresh.id);
  };

  const shortcutClass =
    "flex items-center gap-2 rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-glass)] px-4 py-3 text-sm text-[color:var(--foreground)] transition hover:border-[color:var(--brand)] hover:bg-[color:var(--brand-softer)] text-left";

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4 pointer-events-none">
      <div
        className={cn(
          "h-[500px] sm:h-[600px] flex flex-col rounded-3xl border border-[color:var(--line-strong)] bg-[color:var(--surface)] shadow-[0_32px_64px_-16px_var(--shadow-color)] backdrop-blur-xl transition-all duration-500 ease-in-out pointer-events-auto",
          isMaximized ? "w-[90vw] sm:w-[800px]" : "w-[350px] sm:w-[400px]",
          isOpen
            ? "translate-y-0 opacity-100 scale-100"
            : "translate-y-12 opacity-0 scale-90 pointer-events-none",
        )}
      >
        <div className="flex flex-col gap-2 border-b border-[color:var(--line)] px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--brand-softer)] text-[color:var(--brand)] transition-transform hover:scale-110">
                <Bot className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="text-base font-bold text-[color:var(--foreground-strong)]">{t("title")}</div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full animate-pulse",
                      gatewayToken ? "bg-emerald-500" : "bg-amber-500",
                    )}
                  />
                  <span
                    className={cn(
                      "text-[10px] font-medium uppercase tracking-wider",
                      gatewayToken ? "text-emerald-500/80" : "text-amber-600/90",
                    )}
                  >
                    {gatewayToken ? t("badge.aiConnected") : t("badge.navOnly")}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setIsMaximized(!isMaximized)}
                className="hidden sm:flex rounded-full p-2 text-[color:var(--muted)] hover:bg-[color:var(--brand-softer)] hover:text-[color:var(--brand)] transition-colors"
                title={isMaximized ? "Thu nhỏ" : "Phóng to"}
              >
                {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={addConversation}
                className="rounded-full p-2 text-[color:var(--muted)] hover:bg-[color:var(--brand-softer)] hover:text-[color:var(--brand)] transition-colors"
                title={t("newConversation")}
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={clearHistory}
                className="rounded-full p-2 text-[color:var(--muted)] hover:bg-[color:var(--brand-softer)] hover:text-[color:var(--brand)] transition-colors"
                title={t("clearHistory")}
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-2 text-[color:var(--muted)] hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            {!hydrated || conversations.length === 0 ? (
              <p className="text-xs text-[color:var(--muted)]">{t("loadingThreads")}</p>
            ) : (
              <>
                <label className="sr-only" htmlFor="vclaw-ai-chat-thread">
                  {t("pickConversation")}
                </label>
                <select
                  id="vclaw-ai-chat-thread"
                  value={activeId}
                  disabled={isLoading}
                  onChange={(e) => setActiveId(e.target.value)}
                  className="w-full truncate rounded-xl border border-[color:var(--line-strong)] bg-[color:var(--surface-glass)] px-3 py-2 text-xs text-[color:var(--foreground-strong)] focus:border-[color:var(--brand)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-softer)] disabled:opacity-50"
                >
                  {conversations.map((c) => (
                    <option key={c.id} value={c.id}>
                      {conversationPreview(c.messages, t("conversationUntitled"))}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <div className="h-20 w-20 flex items-center justify-center mb-2 rounded-3xl bg-[color:var(--brand-softer)] text-[color:var(--brand)] drop-shadow-md">
                <Sparkles className="h-10 w-10" />
              </div>
              <p className="text-sm text-[color:var(--foreground)] font-medium max-w-[260px]">{t("welcome")}</p>

              <div className="grid grid-cols-1 gap-2 w-full pt-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--muted)] text-left mb-1">
                  {t("suggestedCommands")}
                </div>
                <button type="button" onClick={() => void handleSend(t("commands.navGuide"))} className={shortcutClass}>
                  <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--brand)]" />
                  {t("commands.navGuide")}
                </button>
                <button type="button" onClick={() => void handleSend(t("commands.navProducts"))} className={shortcutClass}>
                  <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--brand)]" />
                  {t("commands.navProducts")}
                </button>
                <button type="button" onClick={() => void handleSend(t("commands.navOrders"))} className={shortcutClass}>
                  <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--brand)]" />
                  {t("commands.navOrders")}
                </button>
                <button type="button" onClick={() => void handleSend(t("commands.navPost"))} className={shortcutClass}>
                  <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--brand)]" />
                  {t("commands.navPost")}
                </button>
                <button type="button" onClick={() => void handleSend(t("commands.navInbox"))} className={shortcutClass}>
                  <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--brand)]" />
                  {t("commands.navInbox")}
                </button>
              </div>
            </div>
          )}

          {messages.map((m, i) => {
            const isStreamingAssistant =
              isLoading && m.role === "assistant" && i === messages.length - 1;
            const streamingAwaitingTokens = isStreamingAssistant && !m.content.trim();

            const streamStatusMeta =
              isStreamingAssistant && (thought || currentTool) ? (
                <div className="flex flex-col gap-1 px-0.5 pt-1">
                    {thought ? (
                    <div className="text-[10px] text-[color:var(--muted)] font-medium italic animate-pulse">
                      {thought}
                    </div>
                  ) : null}
                  {currentTool ? (
                    <div className="flex items-center gap-1.5 text-[10px] text-[color:var(--brand)] font-bold uppercase tracking-wider">
                      <Sparkles className="h-3 w-3" />
                      {currentTool}
                    </div>
                  ) : null}
                </div>
              ) : null;

            const urls = Array.from(new Set(m.content.match(/((?:https?:\/\/|\/uploads\/)[^\s\)]+)/g) || []));

            return (
              <div
                key={`${activeId}-${i}`}
                className={cn("flex w-full gap-3", m.role === "user" ? "flex-row-reverse" : "flex-row")}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[color:var(--line-strong)] bg-[color:var(--surface)] shadow-sm",
                    m.role === "assistant" && "bg-[color:var(--brand-softer)] text-[color:var(--brand)] border-none",
                  )}
                >
                  {m.role === "user" ? (
                    <User className="h-4 w-4 text-[color:var(--foreground)]" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
                <div
                  className={cn(
                    "flex max-w-[85%] flex-col gap-2 rounded-2xl px-4 py-3 text-sm shadow-sm",
                    m.role === "user"
                      ? "bg-[color:var(--brand)] text-brand-contrast"
                      : "bg-[color:var(--surface-glass)] border border-[color:var(--line)] text-[color:var(--foreground-strong)]",
                  )}
                >
                  {m.role === "user" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-[color:var(--background)] prose-pre:p-2 prose-pre:rounded-lg">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          a: () => null,
                          img: () => null // Để UrlPreview lo việc hiển thị ảnh, tránh duplicate
                        }}
                      >
                        {m.content}
                      </ReactMarkdown>
                    </div>
                  ) : streamingAwaitingTokens ? (
                    <>
                      <div className="flex min-h-[1.25rem] items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--brand)] animate-bounce [animation-delay:-0.3s]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--brand)] animate-bounce [animation-delay:-0.15s]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--brand)] animate-bounce" />
                      </div>
                      {streamStatusMeta}
                    </>
                  ) : (
                    <>
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-[color:var(--background)] prose-pre:p-2 prose-pre:rounded-lg">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            a: () => null, // Ẩn hoàn toàn text link
                            img: () => null // Ẩn ảnh trong markdown
                          }}
                        >
                          {m.content}
                        </ReactMarkdown>
                      </div>
                      {streamStatusMeta}
                    </>
                  )}

                  {/* Link & Image Previews */}
                  {urls.length > 0 && !streamingAwaitingTokens && (
                    <div className="flex flex-col gap-1 w-full">
                      {urls.map((u, idx) => (
                        <UrlPreview key={idx} url={u} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-[color:var(--line)] p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
            className="relative"
          >
            {uploadedImages.length > 0 && (
              <div className="absolute bottom-full left-0 mb-2 flex flex-wrap gap-2 p-2 bg-[color:var(--surface)] border border-[color:var(--line)] rounded-xl shadow-lg w-full max-h-32 overflow-y-auto">
                {uploadedImages.map((url, idx) => (
                  <div key={idx} className="relative group h-12 w-12 rounded-lg overflow-hidden border border-[color:var(--line-strong)]">
                    <img src={url} alt="preview" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setUploadedImages(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-dashed border-[color:var(--line)] hover:border-[color:var(--brand)] text-[color:var(--muted)] hover:text-[color:var(--brand)] transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileUpload(e.target.files)}
              multiple
              accept="image/*"
              className="hidden"
            />
            <div className="relative flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || isUploading}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[color:var(--line-strong)] bg-[color:var(--surface-glass)] text-[color:var(--muted)] hover:text-[color:var(--brand)] hover:border-[color:var(--brand)] transition-all disabled:opacity-50"
              >
                <ImageIcon className="h-5 w-5" />
              </button>
              <div className="relative flex-1">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t("placeholder")}
                  className="w-full rounded-2xl border border-[color:var(--line-strong)] bg-[color:var(--surface-glass)] py-4 pl-5 pr-14 text-sm text-[color:var(--foreground-strong)] transition focus:border-[color:var(--brand)] focus:outline-none focus:ring-4 focus:ring-[color:var(--brand-softer)] placeholder:text-[color:var(--muted)]"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={(!input.trim() && uploadedImages.length === 0) || isLoading || isUploading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--brand)] text-brand-contrast shadow-[0_8px_16px_-4px_var(--brand-glow)] transition hover:brightness-110 disabled:opacity-50 disabled:grayscale"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "group pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full shadow-[0_24px_48px_-12px_var(--brand-glow)] transition-all duration-500 hover:scale-110 active:scale-95",
          isOpen
            ? "bg-[color:var(--surface)] border border-[color:var(--line-strong)] text-[color:var(--brand)]"
            : "bg-gradient-to-br from-[color:var(--brand)] to-[color:var(--brand-glow)] text-brand-contrast",
        )}
      >
        {isOpen ? (
          <ChevronDown className="h-8 w-8" />
        ) : (
          <div className="relative">
            <MessageCircle className="h-8 w-8 transition-transform group-hover:rotate-12" />
            <span className="absolute -right-1 -top-1 flex h-4 w-4">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-4 w-4 rounded-full bg-white scale-75" />
            </span>
          </div>
        )}
      </button>
    </div>
  );
}
