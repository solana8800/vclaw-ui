"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
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
  openclawWebLoginWait,
} from "@/lib/zalouser-gateway";
import {
  filterSessionsForZalouserUi,
  type SessionListEntry,
} from "@/lib/zalouser-session-filters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ZalouserPanelMessages } from "@/lib/zalouser-openclaw-messages";

const ZALOUSER_DOC_URL = "https://docs.openclaw.ai/channels/zalouser";

function extractSessions(raw: unknown): SessionListEntry[] {
  if (!raw || typeof raw !== "object") return [];
  const s = (raw as { sessions?: unknown }).sessions;
  return Array.isArray(s) ? (s as SessionListEntry[]) : [];
}

function sessionRowKey(e: SessionListEntry): string {
  return (e.key ?? e.sessionKey ?? "").trim();
}

function formatWebLoginError(err: unknown): string {
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message?: unknown }).message);
  }
  return String(err);
}

function isWebLoginLikelyUnsupported(err: unknown): boolean {
  const s = formatWebLoginError(err).toLowerCase();
  return (
    s.includes("web login") ||
    s.includes("not available") ||
    s.includes("not supported") ||
    s.includes("provider")
  );
}

type CliBlockDef = { id: string; text: string };

function CopyCliRow({
  block,
  copyLabel,
  copiedLabel,
  onCopied,
  copiedId,
}: {
  block: CliBlockDef;
  copyLabel: string;
  copiedLabel: string;
  onCopied: (id: string) => void;
  copiedId: string | null;
}) {
  const copied = copiedId === block.id;
  return (
    <div className="rounded-md border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-2 space-y-2">
      <pre className="text-[10px] leading-snug whitespace-pre-wrap break-all font-mono">{block.text}</pre>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 text-[11px]"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(block.text);
            onCopied(block.id);
          } catch {
            onCopied("");
          }
        }}
      >
        {copied ? copiedLabel : copyLabel}
      </Button>
    </div>
  );
}

export function OpenclawZalouserPanel({ messages }: { messages: ZalouserPanelMessages }) {
  const token = getPublicGatewayAuthToken();
  const [isPending, startTransition] = useTransition();
  const [connected, setConnected] = useState(false);
  const [statusJson, setStatusJson] = useState<string>("");
  const [sessions, setSessions] = useState<SessionListEntry[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [liveLines, setLiveLines] = useState<string[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loginHint, setLoginHint] = useState<string | null>(null);
  const [webLoginFailed, setWebLoginFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedCliId, setCopiedCliId] = useState<string | null>(null);

  const [sendTo, setSendTo] = useState("");
  const [sendText, setSendText] = useState("");

  const subscribedKeyRef = useRef<string | null>(null);
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCopyTimer = useCallback(() => {
    if (copyResetRef.current) {
      clearTimeout(copyResetRef.current);
      copyResetRef.current = null;
    }
  }, []);

  const onCliCopied = useCallback(
    (id: string) => {
      clearCopyTimer();
      setCopiedCliId(id || null);
      if (!id) return;
      copyResetRef.current = setTimeout(() => setCopiedCliId(null), 2000);
    },
    [clearCopyTimer],
  );

  useEffect(() => () => clearCopyTimer(), [clearCopyTimer]);

  const cliBlocks: CliBlockDef[] = [
    { id: "login", text: messages.cliBlockLogin },
    { id: "logout", text: messages.cliBlockLogout },
    { id: "status", text: messages.cliBlockStatus },
    { id: "dir-self", text: messages.cliBlockDirectorySelf },
    { id: "dir-peers", text: messages.cliBlockDirectoryPeers },
    { id: "dir-groups", text: messages.cliBlockDirectoryGroups },
    { id: "msg-send", text: messages.cliBlockMessageSend },
  ];

  const appendLive = useCallback((line: string) => {
    setLiveLines((prev) => [...prev, line].slice(-200));
  }, []);

  const onSessionMessage = useCallback(
    (payload: GatewayWsSessionMessagePayload) => {
      try {
        appendLive(JSON.stringify(payload, null, 0).slice(0, 2000));
      } catch {
        appendLive(String(payload));
      }
    },
    [appendLive],
  );

  useEffect(() => {
    if (!token.trim()) return;

    gatewayWs.connect({
      token,
      onOpen: () => setConnected(true),
      onClose: () => setConnected(false),
      onSessionMessage,
    });

    return () => {
      gatewayWs.disconnect();
      setConnected(false);
    };
  }, [token, onSessionMessage]);

  const loadStatus = useCallback(() => {
    setError(null);
    startTransition(async () => {
      try {
        const r = await openclawChannelsStatusProbe();
        setStatusJson(JSON.stringify(r, null, 2));
      } catch (e) {
        setError(formatWebLoginError(e));
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
        setError(formatWebLoginError(e));
      }
    });
  }, []);

  useEffect(() => {
    if (!token.trim() || !connected) return;
    startTransition(async () => {
      try {
        await openclawSessionsSubscribe();
        await loadStatus();
        await loadSessions();
      } catch (e) {
        setError(formatWebLoginError(e));
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
        setError(formatWebLoginError(e));
      }
    });
  }, [selectedKey]);

  if (!token.trim()) {
    return (
      <Card className="mt-6 border-amber-600/30 bg-amber-500/5">
        <CardContent className="pt-6 text-sm text-[color:var(--muted)]">{messages.noToken}</CardContent>
      </Card>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      <p className="text-xs text-[color:var(--muted)] leading-relaxed">{messages.warning}</p>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <Card className="border-[color:var(--line)]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{messages.loginTitle}</CardTitle>
          <p className="text-[11px] text-[color:var(--muted)] pt-1 leading-relaxed">{messages.webLoginHint}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={isPending}
              onClick={() => {
                setError(null);
                setWebLoginFailed(false);
                setQrDataUrl(null);
                startTransition(async () => {
                  try {
                    const r = (await openclawWebLoginStart({ force: true })) as {
                      qrDataUrl?: string;
                      message?: string;
                      connected?: boolean;
                    };
                    setLoginHint(r.message ?? null);
                    setQrDataUrl(typeof r.qrDataUrl === "string" ? r.qrDataUrl : null);
                    if (r.connected) setQrDataUrl(null);
                  } catch (e) {
                    if (isWebLoginLikelyUnsupported(e)) setWebLoginFailed(true);
                    setError(formatWebLoginError(e));
                  }
                });
              }}
            >
              {messages.showQr}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={isPending}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  try {
                    const r = (await openclawWebLoginWait()) as { connected?: boolean; message?: string };
                    setLoginHint(r.message ?? null);
                    if (r.connected) setQrDataUrl(null);
                    await loadStatus();
                  } catch (e) {
                    setError(formatWebLoginError(e));
                  }
                });
              }}
            >
              {messages.waitQr}
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
                    setQrDataUrl(null);
                    setLoginHint(null);
                    await loadStatus();
                  } catch (e) {
                    setError(formatWebLoginError(e));
                  }
                });
              }}
            >
              {messages.logout}
            </Button>
          </div>
          {webLoginFailed ? (
            <div className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-3 text-xs space-y-2">
              <p className="font-medium text-[color:var(--foreground-strong)]">{messages.cliFallbackTitle}</p>
              <p className="text-[color:var(--muted)] leading-relaxed">{messages.cliFallbackBody}</p>
            </div>
          ) : null}
          {loginHint ? <p className="text-xs text-[color:var(--muted)]">{loginHint}</p> : null}
          {qrDataUrl ? (
            <div className="flex flex-col items-start gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="QR" className="h-48 w-48 rounded-lg border border-[color:var(--line)]" />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-[color:var(--line)]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between gap-2">
            {messages.statusTitle}
            <Badge variant="outline">{connected ? "WS" : "…"}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button size="sm" variant="secondary" disabled={isPending} onClick={() => loadStatus()}>
            {messages.refreshStatus}
          </Button>
          <p className="text-[11px] text-[color:var(--muted)] leading-relaxed">{messages.rawJsonHint}</p>
          {statusJson ? (
            <details className="rounded-md border border-[color:var(--line)] bg-[color:var(--surface-soft)]">
              <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium text-[color:var(--foreground-strong)]">
                {messages.advancedJsonToggle}
              </summary>
              <pre className="max-h-48 overflow-auto border-t border-[color:var(--line)] p-2 text-[11px]">
                {statusJson}
              </pre>
            </details>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-[color:var(--line)]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{messages.directoryTitle}</CardTitle>
          <p className="text-[11px] text-[color:var(--muted)] pt-1 leading-relaxed">{messages.directoryIntro}</p>
          <p className="text-[11px] pt-1">
            <a
              href={ZALOUSER_DOC_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-700 dark:text-emerald-400 underline underline-offset-2"
            >
              {messages.directoryDocLabel}
            </a>
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {cliBlocks.map((b) => (
            <CopyCliRow
              key={b.id}
              block={b}
              copyLabel={messages.copyLabel}
              copiedLabel={messages.copiedLabel}
              onCopied={onCliCopied}
              copiedId={copiedCliId}
            />
          ))}
        </CardContent>
      </Card>

      <Card className="border-[color:var(--line)]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{messages.sendTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <p className="text-[11px] text-[color:var(--muted)] leading-relaxed">{messages.sendHint}</p>
          <label className="block space-y-1">
            <span className="text-[color:var(--muted)]">{messages.targetLabel}</span>
            <input
              className="mt-1 flex h-9 w-full rounded-md border border-[color:var(--line)] bg-[color:var(--surface)] px-2 font-mono"
              value={sendTo}
              onChange={(e) => setSendTo(e.target.value)}
              placeholder="3492807200904804440"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[color:var(--muted)]">{messages.messageLabel}</span>
            <textarea
              className="mt-1 min-h-[72px] w-full rounded-md border border-[color:var(--line)] bg-[color:var(--surface)] px-2 py-1"
              value={sendText}
              onChange={(e) => setSendText(e.target.value)}
            />
          </label>
          <Button
            size="sm"
            disabled={isPending || !sendTo.trim() || !sendText.trim()}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                try {
                  const r = await openclawSendZalouserDm({
                    to: sendTo.trim(),
                    message: sendText.trim(),
                    sessionKey: selectedKey.trim() || undefined,
                  });
                  appendLive(JSON.stringify({ send: r }, null, 2).slice(0, 4000));
                } catch (e) {
                  setError(formatWebLoginError(e));
                }
              });
            }}
          >
            {messages.sendButton}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-[color:var(--line)]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{messages.sessionsTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button size="sm" variant="secondary" disabled={isPending} onClick={() => loadSessions()}>
            {messages.refreshSessions}
          </Button>
          <p className="text-[11px] text-[color:var(--muted)] leading-relaxed">{messages.selectSessionHint}</p>
          <div className="max-h-56 overflow-auto rounded-md border border-[color:var(--line)]">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-[color:var(--surface-soft)]">
                <tr>
                  <th className="p-2">Key</th>
                  <th className="p-2">Title</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((row) => {
                  const k = sessionRowKey(row);
                  if (!k) return null;
                  const active = selectedKey === k;
                  return (
                    <tr
                      key={k}
                      className={
                        active
                          ? "bg-emerald-500/10 cursor-pointer"
                          : "cursor-pointer hover:bg-[color:var(--surface-soft)]"
                      }
                      onClick={() => setSelectedKey(k)}
                    >
                      <td className="p-2 font-mono break-all">{k}</td>
                      <td className="p-2">{String(row.title ?? row.label ?? "")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-[color:var(--muted)] leading-relaxed">{messages.subscribeLive}</p>
        </CardContent>
      </Card>

      <Card className="border-[color:var(--line)]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{messages.liveTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button size="sm" variant="outline" onClick={() => setLiveLines([])}>
            {messages.clearLive}
          </Button>
          <pre className="max-h-64 overflow-auto rounded-md border border-[color:var(--line)] bg-[color:var(--surface)] p-2 text-[10px] whitespace-pre-wrap">
            {liveLines.join("\n")}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
