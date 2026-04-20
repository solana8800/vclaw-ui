"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { MessageCircle, X, Send, User, RotateCcw, ChevronDown, Bot, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  gatewayWs,
  sendChatMessage,
  getPublicGatewayAuthToken,
} from "@/lib/gateway-client";
import {
  matchAdminChatIntent,
  type AdminNavReplyKey,
} from "@/lib/admin-chat-intents";
import { getLocaleHref, isSupportedLocale, type AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

type Message = {
  role: "user" | "assistant";
  content: string;
};

function navAssistantReply(
  t: (key: `replies.${AdminNavReplyKey}`) => string,
  reply?: AdminNavReplyKey,
) {
  switch (reply) {
    case "navGuide":
      return t("replies.navGuide");
    case "navIntegrations":
      return t("replies.navIntegrations");
    default:
      return t("replies.nav");
  }
}

export function AiChatAssistant() {
  const t = useTranslations("admin.aiChat");
  const router = useRouter();
  const localeRaw = useLocale();
  const locale: AppLocale = isSupportedLocale(localeRaw) ? localeRaw : "vi";
  const gatewayToken = getPublicGatewayAuthToken();

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [thought, setThought] = useState("");
  const [currentTool, setCurrentTool] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gatewayToken) return;

    gatewayWs.connect({
      token: gatewayToken,
      onAgentEvent: (payload) => {
        if (payload.stream === "assistant" && payload.data?.phase === "start") {
          setThought(t("status.thinking"));
        } else if (payload.stream === "tool") {
          const toolName = payload.data?.name || "";
          const phase = payload.data?.phase || "";
          if (phase === "start") {
            setCurrentTool(`${t("status.usingTool")}: ${toolName}`);
          } else if (phase === "end") {
            setCurrentTool("");
          }
        }
      },
      onChatDelta: (delta) => {
        setThought("");
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === "assistant") {
            next[next.length - 1] = { role: "assistant", content: last.content + delta };
          }
          return next;
        });
      },
      onChatDone: () => {
        setIsLoading(false);
        setThought("");
        setCurrentTool("");
      },
    });

    return () => gatewayWs.close();
  }, [gatewayToken, t]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, thought, currentTool]);

  const handleSend = async (text?: string) => {
    const messageText = (text ?? input).trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = { role: "user", content: messageText };
    const intent = matchAdminChatIntent(messageText);

    if (intent?.kind === "nav") {
      setMessages((prev) => [
        ...prev,
        userMessage,
        { role: "assistant", content: navAssistantReply(t, intent.reply) },
      ]);
      setInput("");
      router.push(getLocaleHref(locale, intent.path));
      return;
    }

    if (intent?.kind === "help") {
      setMessages((prev) => [...prev, userMessage, { role: "assistant", content: t("replies.help") }]);
      setInput("");
      router.push(getLocaleHref(locale, "/admin/guide"));
      return;
    }

    if (!gatewayToken) {
      setMessages((prev) => [...prev, userMessage, { role: "assistant", content: t("gatewayOffline") }]);
      setInput("");
      return;
    }

    setMessages((prev) => [...prev, userMessage, { role: "assistant", content: "" }]);
    setInput("");
    setIsLoading(true);
    setThought(t("status.connecting"));

    try {
      await sendChatMessage({
        message: messageText,
        sessionKey: "agent:main:main",
      });
    } catch (error: unknown) {
      console.error("AI Chat Error:", error);
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
            : t("error");
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "assistant") {
          next[next.length - 1] = {
            role: "assistant",
            content: `${t("error")}\n\n${errorMessage}`,
          };
          return next;
        }
        return [...next, { role: "assistant", content: `${t("error")}\n\n${errorMessage}` }];
      });
    }
  };

  const clearHistory = () => {
    setMessages([]);
  };

  const shortcutClass =
    "flex items-center gap-2 rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-glass)] px-4 py-3 text-sm text-[color:var(--foreground)] transition hover:border-[color:var(--brand)] hover:bg-[color:var(--brand-softer)] text-left";

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
        <div className="flex items-center justify-between border-b border-[color:var(--line)] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[color:var(--brand-softer)] text-[color:var(--brand)] transition-transform hover:scale-110">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <div className="text-base font-bold text-[color:var(--foreground-strong)]">{t("title")}</div>
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full animate-pulse",
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
          <div className="flex items-center gap-1">
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
                <button type="button" onClick={() => handleSend(t("commands.navGuide"))} className={shortcutClass}>
                  <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--brand)]" />
                  {t("commands.navGuide")}
                </button>
                <button type="button" onClick={() => handleSend(t("commands.navProducts"))} className={shortcutClass}>
                  <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--brand)]" />
                  {t("commands.navProducts")}
                </button>
                <button type="button" onClick={() => handleSend(t("commands.navOrders"))} className={shortcutClass}>
                  <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--brand)]" />
                  {t("commands.navOrders")}
                </button>
                <button type="button" onClick={() => handleSend(t("commands.navPost"))} className={shortcutClass}>
                  <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--brand)]" />
                  {t("commands.navPost")}
                </button>
                <button type="button" onClick={() => handleSend(t("commands.navInbox"))} className={shortcutClass}>
                  <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--brand)]" />
                  {t("commands.navInbox")}
                </button>
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
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
