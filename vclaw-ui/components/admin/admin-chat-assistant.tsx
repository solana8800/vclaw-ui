"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { MessageCircle, X, Send, User, Bot, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { gatewayWs, sendChatMessage, getPublicGatewayAuthToken } from "@/lib/gateway/client";
import { matchAdminChatIntent } from "@/lib/admin-chat/intents";
import { getLocaleHref, isSupportedLocale, type AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/shared";
import { UrlPreview } from "./url-preview";

type Message = { role: "user" | "assistant"; content: string };

function toFriendlyError(t: (k: string) => string, raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes("quota") || s.includes("429") || s.includes("credit")) return t("errors.quota");
  if (s.includes("overloaded") || s.includes("context") || s.includes("max tokens")) return t("errors.busy");
  if (s.includes("timeout") || s.includes("network") || s.includes("fetch")) return t("errors.network");
  return t("errors.generic");
}

export function AdminChatAssistant() {
  const t = useTranslations("admin.adminAssistant");
  const router = useRouter();
  const rawLocale = useLocale();
  const locale: AppLocale = isSupportedLocale(rawLocale) ? (rawLocale as AppLocale) : "vi";
  const gatewayToken = getPublicGatewayAuthToken();
  const sessionKey = useRef(`admin-${Date.now()}`);

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [thought, setThought] = useState("");
  const [currentTool, setCurrentTool] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const streaming = useRef(false);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, thought, currentTool]);

  useEffect(() => {
    if (!gatewayToken) return;
    gatewayWs.connect({
      token: gatewayToken,
      onAgentEvent: (payload) => {
        const ev = payload as Record<string, unknown>;
        const data = (ev.data as Record<string, unknown>) ?? {};
        if (ev.stream === "assistant" && data.phase === "start") {
          setThought(t("status.thinking"));
        } else if (ev.stream === "tool") {
          const name = typeof data.name === "string" ? data.name : "";
          if (data.phase === "start") setCurrentTool(`${t("status.usingTool")}: ${name}`);
          else if (data.phase === "end") setCurrentTool("");
        }
      },
      onChatDelta: (delta) => {
        setThought("");
        if (!streaming.current) return;
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant") next[next.length - 1] = { role: "assistant", content: last.content + delta };
          return next;
        });
      },
      onChatDone: () => {
        streaming.current = false;
        setIsLoading(false); setThought(""); setCurrentTool("");
      },
      onChatError: (msg) => {
        streaming.current = false;
        setIsLoading(false); setThought(""); setCurrentTool("");
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          const content = toFriendlyError(t, msg);
          if (last?.role === "assistant") { next[next.length - 1] = { role: "assistant", content }; return next; }
          return [...next, { role: "assistant", content }];
        });
      },
    });
    return () => gatewayWs.close();
  }, [gatewayToken, t]);

  const handleSend = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || isLoading) return;

    const intent = matchAdminChatIntent(msg);
    if (intent?.kind === "nav") {
      setMessages((p) => [...p, { role: "user", content: msg }, { role: "assistant", content: t("replies.nav") }]);
      setInput("");
      router.push(getLocaleHref(locale, intent.path || "/admin"));
      return;
    }
    if (intent?.kind === "help") {
      setMessages((p) => [...p, { role: "user", content: msg }, { role: "assistant", content: t("replies.help") }]);
      setInput("");
      router.push(getLocaleHref(locale, "/admin/guide"));
      return;
    }
    if (!gatewayToken) {
      setMessages((p) => [...p, { role: "user", content: msg }, { role: "assistant", content: t("gatewayOffline") }]);
      setInput("");
      return;
    }

    setMessages((p) => [...p, { role: "user", content: msg }, { role: "assistant", content: "" }]);
    setInput("");
    setIsLoading(true);
    streaming.current = true;
    setThought(t("status.connecting"));

    try {
      await sendChatMessage({ message: msg, sessionKey: sessionKey.current });
    } catch (err) {
      streaming.current = false;
      setIsLoading(false); setThought("");
      const content = toFriendlyError(t, err instanceof Error ? err.message : "");
      setMessages((p) => {
        const next = [...p];
        const last = next[next.length - 1];
        if (last?.role === "assistant") { next[next.length - 1] = { role: "assistant", content }; return next; }
        return [...next, { role: "assistant", content }];
      });
    }
  };

  const shortcutCmds = ["navGuide", "navProducts", "navOrders", "navInbox"] as const;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4 pointer-events-none">
      {/* Chat panel */}
      <div className={cn(
        "w-[350px] sm:w-[400px] h-[500px] sm:h-[600px] flex flex-col rounded-3xl border border-[color:var(--line-strong)] bg-[color:var(--surface)] shadow-[0_32px_64px_-16px_var(--shadow-color)] backdrop-blur-xl transition-all duration-500 pointer-events-auto",
        isOpen ? "translate-y-0 opacity-100 scale-100" : "translate-y-12 opacity-0 scale-90 pointer-events-none",
      )}>
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-[color:var(--line)] px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--brand-softer)] text-[color:var(--brand)]">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <div className="text-base font-bold text-[color:var(--foreground-strong)]">{t("title")}</div>
              <div className="flex items-center gap-1.5">
                <span className={cn("h-2 w-2 rounded-full animate-pulse", gatewayToken ? "bg-emerald-500" : "bg-amber-500")} />
                <span className={cn("text-[10px] font-medium uppercase tracking-wider", gatewayToken ? "text-emerald-500/80" : "text-amber-600/90")}>
                  {gatewayToken ? t("badge.aiConnected") : t("badge.navOnly")}
                </span>
              </div>
            </div>
          </div>
          <button type="button" onClick={() => setIsOpen(false)}
            className="rounded-full p-2 text-[color:var(--muted)] hover:bg-rose-500/10 hover:text-rose-500 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <div className="h-20 w-20 flex items-center justify-center rounded-3xl bg-[color:var(--brand-softer)] text-[color:var(--brand)]">
                <Sparkles className="h-10 w-10" />
              </div>
              <p className="text-sm text-[color:var(--foreground)] font-medium max-w-[260px]">{t("welcome")}</p>
              <div className="grid grid-cols-1 gap-2 w-full pt-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--muted)] text-left mb-1">{t("suggestedCommands")}</div>
                {shortcutCmds.map((cmd) => (
                  <button key={cmd} type="button" onClick={() => void handleSend(t(`commands.${cmd}`))}
                    className="flex items-center gap-2 rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-glass)] px-4 py-3 text-sm text-[color:var(--foreground)] hover:border-[color:var(--brand)] hover:bg-[color:var(--brand-softer)] text-left transition">
                    <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--brand)]" />
                    {t(`commands.${cmd}`)}
                  </button>
                ))}
              </div>
            </div>
          ) : messages.map((m, i) => {
            const isStreamingLast = isLoading && m.role === "assistant" && i === messages.length - 1;
            const awaitingTokens = isStreamingLast && !m.content.trim();
            const urls = Array.from(new Set(m.content.match(/((?:https?:\/\/|\/uploads\/)[^\s)]+)/g) ?? []));
            return (
              <div key={i} className={cn("flex w-full gap-3", m.role === "user" ? "flex-row-reverse" : "flex-row")}>
                <div className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[color:var(--line-strong)] bg-[color:var(--surface)] shadow-sm",
                  m.role === "assistant" && "bg-[color:var(--brand-softer)] text-[color:var(--brand)] border-none",
                )}>
                  {m.role === "user" ? <User className="h-4 w-4 text-[color:var(--foreground)]" /> : <Bot className="h-4 w-4" />}
                </div>
                <div className={cn(
                  "flex max-w-[85%] flex-col gap-2 rounded-2xl px-4 py-3 text-sm shadow-sm",
                  m.role === "user" ? "bg-[color:var(--brand)] text-brand-contrast" : "bg-[color:var(--surface-glass)] border border-[color:var(--line)] text-[color:var(--foreground-strong)]",
                )}>
                  {awaitingTokens ? (
                    <div className="flex items-center gap-1 min-h-[1.25rem]">
                      {(["−0.3s", "−0.15s", "0s"] as const).map((d, idx) => (
                        <span key={idx} className="h-1.5 w-1.5 rounded-full bg-[color:var(--brand)] animate-bounce"
                          style={{ animationDelay: d }} />
                      ))}
                    </div>
                  ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-[color:var(--background)] prose-pre:p-2 prose-pre:rounded-lg">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: () => null, img: () => null }}>
                        {m.content}
                      </ReactMarkdown>
                    </div>
                  )}
                  {isStreamingLast && (thought || currentTool) && (
                    <div className="flex flex-col gap-1 px-0.5 pt-1">
                      {thought && <div className="text-[10px] text-[color:var(--muted)] italic animate-pulse">{thought}</div>}
                      {currentTool && (
                        <div className="flex items-center gap-1.5 text-[10px] text-[color:var(--brand)] font-bold uppercase tracking-wider">
                          <Sparkles className="h-3 w-3" />{currentTool}
                        </div>
                      )}
                    </div>
                  )}
                  {urls.length > 0 && !awaitingTokens && (
                    <div className="flex flex-col gap-1 w-full">
                      {urls.map((u, idx) => <UrlPreview key={idx} url={u} />)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Input */}
        <div className="border-t border-[color:var(--line)] p-6">
          <form onSubmit={(e) => { e.preventDefault(); void handleSend(); }}>
            <div className="relative flex-1">
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
                placeholder={t("placeholder")} disabled={isLoading}
                className="w-full rounded-2xl border border-[color:var(--line-strong)] bg-[color:var(--surface-glass)] py-4 pl-5 pr-14 text-sm text-[color:var(--foreground-strong)] focus:border-[color:var(--brand)] focus:outline-none focus:ring-4 focus:ring-[color:var(--brand-softer)] placeholder:text-[color:var(--muted)] disabled:opacity-50" />
              <button type="submit" disabled={!input.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--brand)] text-brand-contrast shadow-[0_8px_16px_-4px_var(--brand-glow)] hover:brightness-110 disabled:opacity-50 disabled:grayscale transition">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Toggle */}
      <button type="button" onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "group pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full shadow-[0_24px_48px_-12px_var(--brand-glow)] transition-all duration-500 hover:scale-110 active:scale-95",
          isOpen ? "bg-[color:var(--surface)] border border-[color:var(--line-strong)] text-[color:var(--brand)]" : "bg-gradient-to-br from-[color:var(--brand)] to-[color:var(--brand-glow)] text-brand-contrast",
        )}>
        {isOpen ? <X className="h-8 w-8" /> : (
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
