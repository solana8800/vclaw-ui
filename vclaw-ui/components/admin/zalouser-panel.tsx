"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  gatewayWs,
  getPublicGatewayAuthToken,
  type GatewayWsSessionMessagePayload,
} from "@/lib/gateway-client";
import {
  openclawChannelsLogoutZalouser,
  openclawChannelsStatusProbe,
  openclawSendZalouserDm,
  openclawSessionsListForZalouser,
  openclawSessionsMessagesSubscribe,
  openclawSessionsMessagesUnsubscribe,
  openclawSessionsSubscribe,
  openclawWebLoginStart,
} from "@/lib/zalouser-gateway";
import {
  filterSessionsForZalouserUi,
  sessionListRowKey,
  type SessionListEntry,
} from "@/lib/zalouser-session-filters";
import {
  pickZalouserAccountFromChannelsStatus,
  type ZalouserGatewayAccountInfo,
} from "@/lib/zalouser-status-account";
import {
  guessSendTargetFromSession,
  parseSessionMessageBubble,
  sessionChatTitle,
  type ZalouserChatLine,
} from "@/lib/zalouser-chat-format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ZalouserPanelMessages } from "@/lib/zalouser-openclaw-messages";
import { cn } from "@/lib/utils";

function extractSessions(raw: unknown): SessionListEntry[] {
  if (!raw || typeof raw !== "object") return [];
  const s = (raw as { sessions?: unknown }).sessions;
  return Array.isArray(s) ? (s as SessionListEntry[]) : [];
}

function formatGatewayError(err: unknown): string {
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message?: unknown }).message);
  }
  return String(err);
}

function ChatBubble({
  line,
  labelThem,
  labelYou,
  labelNote,
}: {
  line: ZalouserChatLine;
  labelThem: string;
  labelYou: string;
  labelNote: string;
}) {
  const label = line.side === "them" ? labelThem : line.side === "you" ? labelYou : labelNote;
  const align = line.side === "them" ? "items-start" : line.side === "you" ? "items-end" : "items-center";
  const bubble =
    line.side === "them"
      ? "rounded-2xl rounded-tl-sm border border-[color:var(--line)] bg-[color:var(--surface-soft)] text-[color:var(--foreground)]"
      : line.side === "you"
        ? "rounded-2xl rounded-tr-sm border border-emerald-700/25 bg-emerald-600/15 text-[color:var(--foreground-strong)]"
        : "max-w-[95%] rounded-lg border border-amber-700/20 bg-amber-500/10 text-[11px] text-[color:var(--muted)]";

  return (
    <div className={cn("flex w-full flex-col gap-0.5", align)}>
      <span className="px-1 text-[10px] font-medium uppercase tracking-wide text-[color:var(--muted)]">
        {label}
      </span>
      <div className={cn("max-w-[min(100%,28rem)] px-3 py-2 text-sm leading-relaxed", bubble)}>
        <p className="whitespace-pre-wrap break-words">{line.text}</p>
        <time className="mt-1 block text-[10px] text-[color:var(--muted)] tabular-nums">
          {new Date(line.at).toLocaleString()}
        </time>
      </div>
    </div>
  );
}

export function OpenclawZalouserPanel({ messages }: { messages: ZalouserPanelMessages }) {
  const token = getPublicGatewayAuthToken();
  const [isPending, startTransition] = useTransition();
  const [loginBusy, setLoginBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [sessions, setSessions] = useState<SessionListEntry[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [gatewayAccount, setGatewayAccount] = useState<ZalouserGatewayAccountInfo | null>(null);
  const [chatBySession, setChatBySession] = useState<Record<string, ZalouserChatLine[]>>({});
  const [sendFlash, setSendFlash] = useState(false);

  const [sendTo, setSendTo] = useState("");
  const [sendText, setSendText] = useState("");
  const [showQrImage, setShowQrImage] = useState(true);
  const [cliQrTick, setCliQrTick] = useState(0);
  const [qrFromGateway, setQrFromGateway] = useState<string | null>(null);
  const [qrFileMtimeMs, setQrFileMtimeMs] = useState<number | null>(null);
  const [loginCommandFlash, setLoginCommandFlash] = useState(false);

  const subscribedKeyRef = useRef<string | null>(null);
  const threadScrollRef = useRef<HTMLDivElement | null>(null);
  const sessionsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loginFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const appendChatLine = useCallback((sessionKey: string, partial: Omit<ZalouserChatLine, "id">) => {
    const id = `${partial.at}-${partial.side}-${Math.random().toString(36).slice(2, 9)}`;
    setChatBySession((prev) => {
      const cur = prev[sessionKey] ?? [];
      return { ...prev, [sessionKey]: [...cur, { ...partial, id }].slice(-200) };
    });
  }, []);

  const onSessionMessage = useCallback(
    (payload: GatewayWsSessionMessagePayload) => {
      const sk = typeof payload.sessionKey === "string" ? payload.sessionKey.trim() : "";
      if (!sk) return;
      const { text, side } = parseSessionMessageBubble(payload);
      appendChatLine(sk, { at: Date.now(), side, text });
    },
    [appendChatLine],
  );

  const loadStatus = useCallback(() => {
    setError(null);
    startTransition(async () => {
      try {
        const r = await openclawChannelsStatusProbe();
        setGatewayAccount(pickZalouserAccountFromChannelsStatus(r));
      } catch (e) {
        setError(formatGatewayError(e));
      }
    });
  }, []);

  const loadSessions = useCallback(() => {
    setError(null);
    startTransition(async () => {
      try {
        const r = await openclawSessionsListForZalouser();
        const rows = filterSessionsForZalouserUi(extractSessions(r));
        setSessions(rows);
      } catch (e) {
        setError(formatGatewayError(e));
      }
    });
  }, []);

  const scheduleSessionsReload = useCallback(() => {
    if (sessionsDebounceRef.current) clearTimeout(sessionsDebounceRef.current);
    sessionsDebounceRef.current = setTimeout(() => {
      sessionsDebounceRef.current = null;
      loadSessions();
    }, 450);
  }, [loadSessions]);

  useEffect(() => {
    if (!token.trim()) return;

    gatewayWs.connect({
      token,
      onOpen: () => setConnected(true),
      onClose: () => setConnected(false),
      onSessionMessage,
      onSessionsChanged: () => scheduleSessionsReload(),
    });

    return () => {
      if (sessionsDebounceRef.current) {
        clearTimeout(sessionsDebounceRef.current);
        sessionsDebounceRef.current = null;
      }
      gatewayWs.disconnect();
      setConnected(false);
    };
  }, [token, onSessionMessage, scheduleSessionsReload]);

  useEffect(() => {
    if (!token.trim() || !connected) return;
    startTransition(async () => {
      try {
        await openclawSessionsSubscribe();
        await loadStatus();
        await loadSessions();
      } catch (e) {
        setError(formatGatewayError(e));
      }
    });
  }, [token, connected, loadStatus, loadSessions]);

  useEffect(() => {
    const key = selectedKey.trim();
    const prev = subscribedKeyRef.current;

    if (!key) {
      if (prev) {
        startTransition(async () => {
          try {
            await openclawSessionsMessagesUnsubscribe(prev);
          } catch {
            /* ignore */
          }
          subscribedKeyRef.current = null;
        });
      }
      return;
    }

    if (prev === key) return;

    startTransition(async () => {
      try {
        if (prev) {
          try {
            await openclawSessionsMessagesUnsubscribe(prev);
          } catch {
            /* ignore */
          }
        }
        await openclawSessionsMessagesSubscribe(key);
        subscribedKeyRef.current = key;
      } catch (e) {
        setError(formatGatewayError(e));
      }
    });
  }, [selectedKey]);

  const selectedRow = useMemo(
    () => sessions.find((s) => sessionListRowKey(s) === selectedKey),
    [sessions, selectedKey],
  );

  const threadLines = selectedKey.trim() ? (chatBySession[selectedKey.trim()] ?? []) : [];

  useEffect(() => {
    const el = threadScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [threadLines.length, selectedKey]);

  useEffect(() => {
    if (!sendFlash) return;
    if (sendFlashTimerRef.current) clearTimeout(sendFlashTimerRef.current);
    sendFlashTimerRef.current = setTimeout(() => {
      sendFlashTimerRef.current = null;
      setSendFlash(false);
    }, 2200);
    return () => {
      if (sendFlashTimerRef.current) clearTimeout(sendFlashTimerRef.current);
    };
  }, [sendFlash]);

  useEffect(() => {
    if (!loginCommandFlash) return;
    if (loginFlashTimerRef.current) clearTimeout(loginFlashTimerRef.current);
    loginFlashTimerRef.current = setTimeout(() => {
      loginFlashTimerRef.current = null;
      setLoginCommandFlash(false);
    }, 6500);
    return () => {
      if (loginFlashTimerRef.current) clearTimeout(loginFlashTimerRef.current);
    };
  }, [loginCommandFlash]);

  /** Luôn gọi POST spawn `openclaw channels login` trước; `web.login.start` chỉ thử thêm (timeout) để lấy QR inline — tránh treo không bao giờ spawn. */
  useEffect(() => {
    if (qrFromGateway) {
      setQrFileMtimeMs(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/openclaw/zalouser-cli-qr/meta?bust=${cliQrTick}`);
        const j = (await r.json()) as { ok?: boolean; mtimeMs?: number };
        if (cancelled) return;
        if (j.ok && typeof j.mtimeMs === "number") setQrFileMtimeMs(j.mtimeMs);
        else setQrFileMtimeMs(null);
      } catch {
        if (!cancelled) setQrFileMtimeMs(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cliQrTick, qrFromGateway]);

  const zaloLinked = Boolean(gatewayAccount?.linked);
  const qrImgSrc = qrFromGateway ?? `/api/openclaw/zalouser-cli-qr?t=${cliQrTick}`;

  async function handleStartLogin() {
    setError(null);
    setLoginBusy(true);
    setQrFromGateway(null);
    const TIMEOUT = Symbol("webLoginTimeout");
    try {
      const res = await fetch("/api/openclaw/zalouser-channels-login", {
        method: "POST",
        headers: token.trim() ? { Authorization: `Bearer ${token.trim()}` } : {},
      });
      if (res.status === 401 || res.status === 403) {
        setError(messages.loginErrorGeneric);
        return;
      }
      if (!res.ok) {
        setError(messages.loginErrorGeneric);
        return;
      }
      setLoginCommandFlash(true);
      setCliQrTick((n) => n + 1);
      setTimeout(() => setCliQrTick((n) => n + 1), 1500);
      setTimeout(() => setCliQrTick((n) => n + 1), 4000);

      void (async () => {
        try {
          const raced = await Promise.race([
            openclawWebLoginStart({ force: true }),
            new Promise<typeof TIMEOUT>((resolve) => setTimeout(() => resolve(TIMEOUT), 2500)),
          ]);
          if (raced === TIMEOUT) return;
          if (!raced || typeof raced !== "object") return;
          const q = (raced as { qrDataUrl?: unknown }).qrDataUrl;
          if (typeof q === "string" && q.startsWith("data:image")) setQrFromGateway(q);
        } catch {
          /* ignore */
        }
      })();
    } finally {
      setLoginBusy(false);
    }
  }

  if (!token.trim()) {
    return (
      <Card className="mt-6 border-amber-600/30 bg-amber-500/5">
        <CardContent className="pt-6 text-sm text-[color:var(--muted)]">{messages.noToken}</CardContent>
      </Card>
    );
  }

  return (
    <div className="mt-6 space-y-5">
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={connected ? "default" : "outline"}>
            {connected ? messages.stripConnected : messages.stripDisconnected}
          </Badge>
          {gatewayAccount ? (
            <Badge variant={zaloLinked ? "default" : "outline"} className={!zaloLinked ? "border-amber-600/40" : ""}>
              {zaloLinked ? messages.stripZaloLinked : messages.stripZaloNotLinked}
            </Badge>
          ) : null}
        </div>
        <Button
          size="sm"
          variant="secondary"
          disabled={isPending}
          onClick={() => {
            loadStatus();
            loadSessions();
          }}
        >
          {messages.refreshStatus}
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        <aside className="space-y-4 lg:col-span-4">
          <Card className="border-[color:var(--line)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{messages.loginTitle}</CardTitle>
              <p className="pt-1 text-sm leading-relaxed text-[color:var(--muted)]">{messages.loginIntro}</p>
              <p className="pt-2 text-xs text-[color:var(--muted)]">
                {gatewayAccount ? (
                  <>
                    {messages.accountPrefix}{" "}
                    <span className="font-medium text-[color:var(--foreground-strong)]">
                      {gatewayAccount.displayName}
                    </span>
                    <span className="text-[color:var(--muted)]">
                      {" "}
                      ({gatewayAccount.accountId}) —{" "}
                      {gatewayAccount.linked ? messages.accountLinked : messages.accountNotLinked}
                    </span>
                  </>
                ) : (
                  messages.accountUnknown
                )}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {loginCommandFlash ? (
                <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300/95">{messages.loginCommandSent}</p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" disabled={loginBusy || isPending} onClick={() => void handleStartLogin()}>
                  {loginBusy ? messages.startLoginBusy : messages.startLogin}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => {
                    setError(null);
                    startTransition(async () => {
                      try {
                        await openclawChannelsLogoutZalouser();
                        setQrFromGateway(null);
                        setCliQrTick((n) => n + 1);
                        await loadStatus();
                      } catch (e) {
                        setError(formatGatewayError(e));
                      }
                    });
                  }}
                >
                  {gatewayAccount
                    ? messages.logoutWithAccount.replace(/\{\{display\}\}/g, gatewayAccount.displayName)
                    : messages.logout}
                </Button>
              </div>
              <div className="space-y-2 rounded-xl border border-[color:var(--line)] bg-[color:var(--surface)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={() => setCliQrTick((n) => n + 1)}>
                    {messages.qrReload}
                  </Button>
                </div>
                <label className="flex cursor-pointer select-none items-center gap-2 text-xs text-[color:var(--muted)]">
                  <input
                    type="checkbox"
                    className="size-3.5 rounded border border-[color:var(--line)] accent-emerald-600"
                    checked={showQrImage}
                    onChange={(e) => setShowQrImage(e.target.checked)}
                  />
                  {messages.showQrLabel}
                </label>
                {showQrImage ? (
                  <div className="flex flex-col items-center gap-2 pt-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrImgSrc}
                      alt=""
                      className="h-52 w-52 max-w-full rounded-lg border border-[color:var(--line)] bg-white object-contain p-2 dark:bg-zinc-950 sm:h-60 sm:w-60"
                    />
                    {qrFromGateway ? (
                      <p className="text-center text-xs text-[color:var(--muted)]">{messages.qrFromGatewayShort}</p>
                    ) : qrFileMtimeMs != null ? (
                      <p className="text-center text-xs text-[color:var(--muted)]">
                        {messages.qrFileUpdated.replace(
                          "{{time}}",
                          new Date(qrFileMtimeMs).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }),
                        )}
                      </p>
                    ) : (
                      <p className="text-center text-xs text-amber-900/90 dark:text-amber-200/85">{messages.qrFileMissing}</p>
                    )}
                    <p className="text-center text-xs text-[color:var(--muted)]">{messages.scanQrShort}</p>
                  </div>
                ) : (
                  <p className="text-xs text-amber-800 dark:text-amber-200/90">{messages.hideQrNote}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-[color:var(--line)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{messages.sessionsTitle}</CardTitle>
              <p className="pt-1 text-xs leading-relaxed text-[color:var(--muted)]">{messages.selectSessionHint}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button size="sm" variant="secondary" disabled={isPending} onClick={() => loadSessions()}>
                {messages.refreshSessions}
              </Button>
              <div className="max-h-[min(52vh,420px)] space-y-1 overflow-y-auto rounded-xl border border-[color:var(--line)] bg-[color:var(--surface)] p-1">
                {sessions.length === 0 ? (
                  <p className="p-3 text-sm text-[color:var(--muted)]">{messages.listEmpty}</p>
                ) : (
                  sessions.map((row) => {
                    const k = sessionListRowKey(row);
                    if (!k) return null;
                    const active = selectedKey === k;
                    const title = sessionChatTitle(row);
                    const preview =
                      typeof row.lastMessagePreview === "string" && row.lastMessagePreview.trim()
                        ? row.lastMessagePreview.trim()
                        : null;
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => {
                          setSelectedKey(k);
                          const t = guessSendTargetFromSession(row);
                          if (t) setSendTo(t);
                        }}
                        className={cn(
                          "w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
                          active
                            ? "border-emerald-600/50 bg-emerald-500/10"
                            : "border-transparent hover:bg-[color:var(--surface-soft)]",
                        )}
                      >
                        <span className="block text-sm font-medium text-[color:var(--foreground-strong)]">{title}</span>
                        {preview ? (
                          <span className="mt-0.5 line-clamp-2 block text-[11px] text-[color:var(--muted)]">
                            {messages.previewPrefix}
                            {preview}
                          </span>
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </aside>

        <section className="flex min-h-[min(72vh,560px)] flex-col rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] lg:col-span-8">
          {!selectedKey.trim() ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
              <p className="max-w-sm text-sm text-[color:var(--muted)]">{messages.selectSessionHint}</p>
            </div>
          ) : (
            <>
              <header className="border-b border-[color:var(--line)] px-4 py-3">
                <h2 className="text-lg font-semibold text-[color:var(--foreground-strong)]">
                  {selectedRow ? sessionChatTitle(selectedRow) : selectedKey}
                </h2>
                {selectedRow &&
                typeof selectedRow.lastMessagePreview === "string" &&
                selectedRow.lastMessagePreview.trim() ? (
                  <p className="mt-1 text-xs text-[color:var(--muted)]">
                    {messages.previewPrefix}
                    {selectedRow.lastMessagePreview.trim()}
                  </p>
                ) : null}
              </header>

              <div ref={threadScrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto px-3 py-4">
                {threadLines.length === 0 ? (
                  <p className="m-auto max-w-sm text-center text-sm text-[color:var(--muted)]">{messages.threadEmpty}</p>
                ) : (
                  threadLines.map((line) => (
                    <ChatBubble
                      key={line.id}
                      line={line}
                      labelThem={messages.bubbleThem}
                      labelYou={messages.bubbleYou}
                      labelNote={messages.bubbleNote}
                    />
                  ))
                )}
              </div>

              <footer className="space-y-3 border-t border-[color:var(--line)] bg-[color:var(--surface-soft)] p-4">
                <h3 className="text-sm font-medium text-[color:var(--foreground-strong)]">{messages.sendTitle}</h3>
                <p className="text-xs leading-relaxed text-[color:var(--muted)]">{messages.sendHint}</p>
                <label className="block space-y-1">
                  <span className="text-xs text-[color:var(--muted)]">{messages.sendToLabel}</span>
                  <input
                    className="mt-1 flex h-10 w-full rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] px-3 text-sm"
                    value={sendTo}
                    onChange={(e) => setSendTo(e.target.value)}
                    autoComplete="off"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs text-[color:var(--muted)]">{messages.messageLabel}</span>
                  <textarea
                    className="mt-1 min-h-[88px] w-full resize-y rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-sm"
                    value={sendText}
                    onChange={(e) => setSendText(e.target.value)}
                  />
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    size="sm"
                    disabled={isPending || !sendTo.trim() || !sendText.trim()}
                    onClick={() => {
                      setError(null);
                      const sk = selectedKey.trim();
                      const text = sendText.trim();
                      const to = sendTo.trim();
                      startTransition(async () => {
                        try {
                          await openclawSendZalouserDm({
                            to,
                            message: text,
                            sessionKey: sk || undefined,
                          });
                          appendChatLine(sk, { at: Date.now(), side: "you", text });
                          setSendText("");
                          setSendFlash(true);
                          await loadSessions();
                        } catch (e) {
                          setError(formatGatewayError(e));
                        }
                      });
                    }}
                  >
                    {messages.sendButton}
                  </Button>
                  {sendFlash ? (
                    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                      {messages.sendOkNotice}
                    </span>
                  ) : null}
                </div>
              </footer>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
