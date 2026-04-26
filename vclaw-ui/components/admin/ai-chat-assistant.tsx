"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { MessageCircle, X, Send, User, RotateCcw, ChevronDown, Bot, Sparkles, Plus } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  gatewayWs,
  sendChatMessage,
  getPublicGatewayAuthToken,
} from "@/lib/gateway/client";
import { formatGatewayHealthMessage } from "@/lib/openclaw/zero-token-health-message";
import { resolveGatewayHealthAction } from "@/lib/openclaw/zero-token-health-action";
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

type TranslateFn = (
  key: string,
  values?: Record<string, string | number | Date>,
) => string;

const SALES_CHAT_SYSTEM_PREFIX = [
  "[VCLAW_SALES_MODE]",
  "Bạn là nhân viên sales online của cửa hàng tại Việt Nam.",
  "Chỉ tư vấn liên quan: sản phẩm, đơn hàng, ship, thanh toán, lịch hẹn, đăng bài, chăm sóc khách.",
  "Không tự nhận là trợ lý kỹ thuật hoặc chuyên gia ngoài ngành bán hàng.",
  "Khi người dùng hỏi đi lệch chủ đề, kéo về ngữ cảnh bán hàng và đề xuất bước chốt đơn phù hợp.",
  "Trả lời như con người: ngắn gọn, tự nhiên, tối đa 3 câu, ưu tiên câu hành động rõ ràng.",
  "Nếu cần mở màn hình trong admin, nói rõ người dùng bấm gì ngay trên trang đó.",
].join("\n");

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

function composeSalesPrompt(userMessage: string): string {
  return `${SALES_CHAT_SYSTEM_PREFIX}\n\n[KHÁCH_NÓI]\n${userMessage.trim()}`;
}

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

export function AiChatAssistant() {
  const t = useTranslations("admin.aiChat");
  const gatewayStatusT = useTranslations("admin.openclawStatus");
  const conversationsRef = useRef<AdminAiChatConversation[]>([]);
  const router = useRouter();
  const localeRaw = useLocale();
  const locale: AppLocale = isSupportedLocale(localeRaw) ? localeRaw : "vi";
  const gatewayToken = getPublicGatewayAuthToken();
  const zeroTokenRunbookHref = getLocaleHref(locale, "/docs/18-VClaw-Zero-Token-Onboarding");

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [conversations, setConversations] = useState<AdminAiChatConversation[]>([]);
  const [activeId, setActiveId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [thought, setThought] = useState("");
  const [currentTool, setCurrentTool] = useState("");
  /** Server-side reachability of OPENCLAW_GATEWAY_URL (/health); refreshed while chat panel is open. */
  const [gatewayHealth, setGatewayHealth] = useState<{
    ok: boolean;
    status: number;
    baseUrl: string;
    wsUrl?: string;
    authConfigured?: boolean;
    mode?: "zero-token" | "upstream" | "unknown";
    diagnosis?: "ok" | "unauthorized" | "unreachable" | "http_error";
    readiness?: {
      hasZeroTokenModels: boolean;
      hasUsableZeroTokenAuth: boolean;
      hasZeroTokenRuntimeModel: boolean;
      zeroTokenProviders: string[];
      sampleModels: string[];
      runtimeModelRef?: string;
      runtimeModelSource?: "defaults" | "recent";
      authProviders: Array<{ provider: string; displayName: string; status: string }>;
    };
    error?: string;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef(activeId);
  const streamingConversationIdRef = useRef<string | null>(null);

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
    if (!isOpen) return;
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch("/api/openclaw-health", { cache: "no-store" });
        const data = (await res.json()) as {
          ok?: boolean;
          status?: number;
          baseUrl?: string;
          wsUrl?: string;
          authConfigured?: boolean;
          mode?: "zero-token" | "upstream" | "unknown";
          diagnosis?: "ok" | "unauthorized" | "unreachable" | "http_error";
          readiness?: {
            hasZeroTokenModels: boolean;
            hasUsableZeroTokenAuth: boolean;
            hasZeroTokenRuntimeModel: boolean;
            zeroTokenProviders: string[];
            sampleModels: string[];
            runtimeModelRef?: string;
            runtimeModelSource?: "defaults" | "recent";
            authProviders: Array<{ provider: string; displayName: string; status: string }>;
          };
          error?: string;
        };
        if (cancelled) return;
        setGatewayHealth({
          ok: Boolean(data.ok),
          status: typeof data.status === "number" ? data.status : res.status,
          baseUrl: typeof data.baseUrl === "string" ? data.baseUrl : "",
          wsUrl: typeof data.wsUrl === "string" ? data.wsUrl : undefined,
          authConfigured: data.authConfigured === true,
          mode: data.mode,
          diagnosis: data.diagnosis,
          readiness: data.readiness,
          error: typeof data.error === "string" ? data.error : undefined,
        });
      } catch {
        if (!cancelled) {
          setGatewayHealth({
            ok: false,
            status: 0,
            baseUrl: "",
            wsUrl: undefined,
            authConfigured: Boolean(gatewayToken),
            mode: "unknown",
            diagnosis: "unreachable",
            error: "unreachable",
          });
        }
      }
    };
    void check();
    const interval = window.setInterval(check, 45_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [gatewayToken, isOpen]);

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
    });

    return () => gatewayWs.close();
  }, [gatewayToken, t, updateConversationMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, thought, currentTool]);

  const handleSend = async (text?: string) => {
    const messageText = (text ?? input).trim();
    if (!messageText || isLoading) return;

    const convId = activeIdRef.current;
    if (!convId) return;

    const userMessage: AdminAiChatMessage = { role: "user", content: messageText };
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
      await sendChatMessage({
        message: composeSalesPrompt(messageText),
        sessionKey,
      });
    } catch (error: unknown) {
      console.error("AI Chat Error:", error);
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
  const gatewayActionReason = gatewayHealth
    ? resolveGatewayHealthAction({
        diagnosis: gatewayHealth.diagnosis ?? "unreachable",
        mode: gatewayHealth.mode ?? "unknown",
        authConfigured: gatewayHealth.authConfigured === true,
        readiness: gatewayHealth.readiness,
      })
    : null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4 pointer-events-none">
      <div
        className={cn(
          "w-[350px] sm:w-[400px] h-[500px] sm:h-[600px] flex flex-col rounded-3xl border border-[color:var(--line-strong)] bg-[color:var(--surface)] shadow-[0_32px_64px_-16px_var(--shadow-color)] backdrop-blur-xl transition-all duration-500 ease-in-out pointer-events-auto",
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
                <p className="text-[10px] text-[color:var(--muted)]">{t("savedLocally")}</p>
              </>
            )}
          </div>
          {gatewayHealth &&
            (gatewayHealth.diagnosis !== "ok" ||
              gatewayHealth.authConfigured !== true ||
              gatewayHealth.mode !== "upstream") && (
            <div
              role="alert"
              className="rounded-xl border border-amber-500/45 bg-amber-500/10 px-3 py-2 text-[11px] leading-snug text-amber-950 dark:text-amber-100"
            >
              <div>
                {formatGatewayHealthMessage({
                  diagnosis: gatewayHealth.diagnosis ?? "unreachable",
                  baseUrl: gatewayHealth.baseUrl || "—",
                  wsUrl: gatewayHealth.wsUrl || "—",
                  mode: gatewayHealth.mode ?? "unknown",
                  authConfigured: gatewayHealth.authConfigured === true,
                  status: gatewayHealth.status,
                  readiness: gatewayHealth.readiness,
                })}
              </div>
              {gatewayActionReason ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => router.push(zeroTokenRunbookHref)}
                    className="rounded-lg border border-amber-700/30 bg-white/70 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-amber-900 transition hover:bg-white"
                  >
                    {gatewayStatusT("actionButton")}
                  </button>
                  <span>{gatewayStatusT(`actionDescriptions.${gatewayActionReason}`)}</span>
                </div>
              ) : null}
            </div>
          )}
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

          {messages.map((m, i) => (
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
                <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-[color:var(--background)] prose-pre:p-2 prose-pre:rounded-lg">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex w-full gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[color:var(--brand-softer)] text-[color:var(--brand)]">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex gap-1 items-center bg-[color:var(--surface-glass)] border border-[color:var(--line)] rounded-2xl px-4 py-3">
                  <span className="w-1.5 h-1.5 bg-[color:var(--brand)] rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-[color:var(--brand)] rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-[color:var(--brand)] rounded-full animate-bounce" />
                </div>
                {(thought || currentTool) && (
                  <div className="flex flex-col gap-1 px-1">
                    {thought && (
                      <div className="text-[10px] text-[color:var(--muted)] font-medium italic animate-pulse">
                        {thought}...
                      </div>
                    )}
                    {currentTool && (
                      <div className="flex items-center gap-1.5 text-[10px] text-[color:var(--brand)] font-bold uppercase tracking-wider">
                        <Sparkles className="h-3 w-3" />
                        {currentTool}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-[color:var(--line)] p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
            className="relative"
          >
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
              disabled={!input.trim() || isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--brand)] text-brand-contrast shadow-[0_8px_16px_-4px_var(--brand-glow)] transition hover:brightness-110 disabled:opacity-50 disabled:grayscale"
            >
              <Send className="h-4 w-4" />
            </button>
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
