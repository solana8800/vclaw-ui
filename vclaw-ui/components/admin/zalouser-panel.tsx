"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import {
  gatewayWs,
  getPublicGatewayAuthToken,
  type GatewayWsSessionMessagePayload,
} from "@/lib/gateway-client";
import {
  openclawChannelsLogoutZalouser,
  openclawChannelsStatusProbe,
  openclawDirectoryGroupsList,
  openclawDirectoryPeersList,
  openclawSendZalouserDm,
  openclawSessionsListForZalouser,
  openclawSessionsMessagesSubscribe,
  openclawSessionsMessagesUnsubscribe,
  openclawSessionsSubscribe,
  openclawWebLoginStart,
} from "@/lib/zalouser-gateway";
import { syncZalouserStatus, logoutZalouser, getZalouserGroups } from "@/lib/actions/zalouser-cli-actions";
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

export function OpenclawZalouserPanel({ 
  messages, 
  initialDbState 
}: { 
  messages: ZalouserPanelMessages;
  initialDbState?: { isLinked: boolean; displayName: string | null; connectedAt: Date | null }
}) {
  const token = getPublicGatewayAuthToken();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [loginBusy, setLoginBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [sessions, setSessions] = useState<SessionListEntry[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [gatewayAccount, setGatewayAccount] = useState<{ displayName: string | null; linked: boolean }>({
    displayName: initialDbState?.displayName ?? null,
    linked: initialDbState?.isLinked ?? false,
  });
  const [chatBySession, setChatBySession] = useState<Record<string, ZalouserChatLine[]>>({});
  const [sendFlash, setSendFlash] = useState(false);

  const [sendTo, setSendTo] = useState("");
  const [sendText, setSendText] = useState("");
  const [cliQrTick, setCliQrTick] = useState(0);
  const [qrFromGateway, setQrFromGateway] = useState<string | null>(null);
  const [qrFileMtimeMs, setQrFileMtimeMs] = useState<number | null>(null);
  const [loginCommandFlash, setLoginCommandFlash] = useState(false);
  const [activeTab, setActiveTab] = useState<"sessions" | "peers" | "groups">("sessions");
  const [peers, setPeers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);

  const subscribedKeyRef = useRef<string | null>(null);
  const threadScrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const sendFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loginFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const urlTo = searchParams.get("to");
  useEffect(() => { if (urlTo?.trim()) setSendTo(urlTo.trim()); }, [urlTo]);
  useEffect(() => { if (selectedKey && inputRef.current) inputRef.current.focus(); }, [selectedKey]);

  const appendChatLine = useCallback((sessionKey: string, partial: Omit<ZalouserChatLine, "id">) => {
    const id = `${partial.at}-${partial.side}-${Math.random().toString(36).slice(2, 9)}`;
    setChatBySession((prev) => {
      const cur = prev[sessionKey] ?? [];
      return { ...prev, [sessionKey]: [...cur, { ...partial, id }].slice(-200) };
    });
  }, []);

  const onSessionMessage = useCallback((payload: any) => {
    const sk = typeof payload?.sessionKey === "string" ? payload.sessionKey.trim() : "";
    if (!sk) return;
    const bubble = parseSessionMessageBubble(payload.message);
    if (bubble) appendChatLine(sk, { ...bubble, at: Date.now() });
  }, [appendChatLine]);

  const loadStatus = useCallback(async () => {
    try {
      const res = await syncZalouserStatus();
      if (res.success) {
        setGatewayAccount({ displayName: res.displayName || null, linked: res.isLinked || false });
        setConnected(true);
        return res;
      } else {
        setGatewayAccount({ displayName: null, linked: false });
        setConnected(false);
        setError(res.error || "Cannot connect to OpenClaw Zalo CLI");
        return null;
      }
    } catch (e) {
      setConnected(false);
      setError(formatGatewayError(e));
      return null;
    }
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      const raw = await openclawSessionsListForZalouser();
      const extracted = extractSessions(raw);
      setSessions(filterSessionsForZalouserUi(extracted));
    } catch (e) { console.error("Sessions load error:", e); }
  }, []);

  const loadPeersAndGroups = useCallback(async () => {
    try {
      const [p, gRes] = await Promise.all([
        openclawDirectoryPeersList().catch(() => null), 
        getZalouserGroups()
      ]);
      if (p && (p as any).peers) setPeers((p as any).peers);
      if (gRes.success) setGroups(gRes.groups);
    } catch (e) { console.error("Directory load error:", e); }
  }, []);

  useEffect(() => {
    if (!token.trim()) return;
    if (typeof gatewayWs.on !== "function") {
      console.warn("gatewayWs.on is not yet available - bundle might be updating...");
      return;
    }
    const unsubMessage = gatewayWs.on("session.message", onSessionMessage);
    const unsubWatch = gatewayWs.on("web.fs.watch", (payload: any) => {
      if (payload?.path?.includes("zalouser-login-qr.png") && typeof payload.mtimeMs === "number") {
        setQrFileMtimeMs(payload.mtimeMs);
        setCliQrTick(n => n + 1);
      }
    });
    return () => { unsubMessage(); unsubWatch(); };
  }, [token, onSessionMessage]);

  useEffect(() => {
    if (!token.trim()) return;
    const init = async () => {
      setInitialLoading(true);
      try {
        // Đảm bảo gatewayWs được kết nối
        if (typeof gatewayWs.connect === "function" && !connected) {
          gatewayWs.connect({ token: token.trim() });
        }
        await openclawSessionsSubscribe();
        const acc = await loadStatus();
        await loadSessions();
        if (acc?.isLinked || gatewayAccount?.linked) await loadPeersAndGroups();
      } catch (e) { 
        console.error("Init error:", e);
        setError(formatGatewayError(e)); 
      }
      finally { setInitialLoading(false); }
    };
    init();
  }, [token]); // Chỉ phụ thuộc vào token khi khởi chạy

  useEffect(() => {
    if (!selectedKey || !connected) return;
    const sk = selectedKey;
    if (sk.startsWith("zalouser-")) return;
    if (subscribedKeyRef.current === sk) return;
    subscribedKeyRef.current = sk;
    openclawSessionsMessagesSubscribe(sk).catch(e => console.error("Subscribe error:", e));
    return () => {
      if (subscribedKeyRef.current === sk) {
        subscribedKeyRef.current = null;
        openclawSessionsMessagesUnsubscribe(sk).catch(() => {});
      }
    };
  }, [selectedKey, connected]);

  useEffect(() => {
    if (threadScrollRef.current) {
      threadScrollRef.current.scrollTop = threadScrollRef.current.scrollHeight;
    }
  }, [chatBySession, selectedKey]);

  const threadLines = chatBySession[selectedKey] ?? [];
  const selectedRow = sessions.find((s) => sessionListRowKey(s) === selectedKey);
  const zaloLinked = Boolean(gatewayAccount?.linked);

  const handleSend = useCallback(() => {
    if (isPending || !sendTo.trim() || !sendText.trim()) return;
    setError(null);
    const sk = selectedKey.trim();
    const text = sendText.trim();
    const to = sendTo.trim();
    startTransition(async () => {
      try {
        await openclawSendZalouserDm({
          to,
          message: text,
          sessionKey: sk.startsWith("zalouser-") ? undefined : (sk || undefined),
        });
        appendChatLine(sk, { at: Date.now(), side: "you", text });
        setSendText("");
        setSendFlash(true);
        if (sendFlashTimerRef.current) clearTimeout(sendFlashTimerRef.current);
        sendFlashTimerRef.current = setTimeout(() => setSendFlash(false), 3000);
        await loadSessions();
        setTimeout(() => inputRef.current?.focus(), 50);
      } catch (e) { setError(formatGatewayError(e)); }
    });
  }, [selectedKey, sendText, sendTo, appendChatLine, loadSessions, isPending]);

  async function handleStartLogin() {
    setError(null); setLoginBusy(true); setQrFromGateway(null);
    try {
      const res = await fetch("/api/openclaw/zalouser-channels-login", {
        method: "POST",
        headers: token.trim() ? { Authorization: `Bearer ${token.trim()}` } : {},
      });
      if (!res.ok) { setError(messages.loginErrorGeneric); return; }
      setLoginCommandFlash(true);
      if (loginFlashTimerRef.current) clearTimeout(loginFlashTimerRef.current);
      loginFlashTimerRef.current = setTimeout(() => setLoginCommandFlash(false), 5000);
      setCliQrTick(n => n + 1);
      const raced = await Promise.race([
        openclawWebLoginStart({ force: true }),
        new Promise(resolve => setTimeout(() => resolve(null), 3000))
      ]);
      if (raced && typeof raced === "object" && (raced as any).qrDataUrl) {
        setQrFromGateway((raced as any).qrDataUrl);
      }
    } finally { setLoginBusy(false); }
  }

  if (initialLoading) {
    return (
      <div className="mt-8 flex min-h-[400px] flex-col items-center justify-center gap-6 rounded-3xl border border-[color:var(--line)] bg-[color:var(--surface)] p-12 text-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-[color:var(--line)] border-t-[color:var(--foreground-strong)]" />
        <div className="space-y-1">
          <h2 className="text-xl font-black text-[color:var(--foreground-strong)] uppercase italic tracking-wider">VClaw Zalo</h2>
          <p className="text-sm text-[color:var(--muted)] font-medium">Đang chuẩn bị phiên làm việc...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6 animate-in fade-in duration-500">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {error}
        </div>
      )}
      <div className="flex flex-col gap-4 rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-4 sm:flex-row sm:items-center sm:justify-between shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={connected ? "default" : "outline"} className={connected ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" : ""}>
            Gateway: {connected ? "Sẵn sàng" : "Mất kết nối"}
          </Badge>
          {zaloLinked && <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/20">Zalo: Đã liên kết</Badge>}
        </div>
        <Button size="sm" variant="secondary" className="rounded-full px-5 font-bold text-xs" disabled={isPending} onClick={() => { loadStatus(); loadSessions(); if (zaloLinked) loadPeersAndGroups(); }}>
          {isPending && <span className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />}
          Làm mới
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <aside className="space-y-6 lg:col-span-4">
          {!zaloLinked ? (
            <Card className="overflow-hidden border-[color:var(--line)]">
              <CardHeader className="bg-zinc-50 dark:bg-zinc-900/50 pb-4 border-b border-[color:var(--line)]">
                <CardTitle className="text-base font-bold italic">Đăng nhập Zalo</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-5 flex flex-col items-center">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 rounded-xl" disabled={loginBusy || isPending} onClick={handleStartLogin}>
                  {loginBusy && <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                  Bắt đầu đăng nhập
                </Button>
                <div className="p-4 rounded-2xl border border-[color:var(--line)] bg-white dark:bg-zinc-950">
                  <img src={qrFromGateway ?? `/api/openclaw/zalouser-cli-qr?t=${cliQrTick}`} alt="QR" className="h-48 w-48 object-contain" />
                </div>
                <p className="text-center text-[10px] text-[color:var(--muted)]">Quét mã bằng ứng dụng Zalo trên điện thoại.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-black">{gatewayAccount?.displayName?.charAt(0) || "Z"}</div>
                <div>
                  <p className="text-sm font-black truncate">{gatewayAccount?.displayName || "Tài khoản Zalo"}</p>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Đang hoạt động</p>
                </div>
              </div>
              <Button size="sm" variant="ghost" className="h-8 w-8 px-0 text-red-500 hover:bg-red-100 rounded-full" onClick={() => { startTransition(async () => { try { await logoutZalouser(); await loadStatus(); } catch (e) { setError(formatGatewayError(e)); } }); }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </Button>
            </Card>
          )}

          <Card className="border-[color:var(--line)] overflow-hidden">
            <div className="flex p-1 bg-zinc-100 dark:bg-zinc-900 border-b border-[color:var(--line)]">
              {(["sessions", "peers", "groups"] as const).map(t => (
                <button key={t} onClick={() => setActiveTab(t)} className={cn("flex-1 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded-lg", activeTab === t ? "bg-white dark:bg-zinc-800 text-emerald-600 shadow-sm" : "text-[color:var(--muted)] hover:text-[color:var(--foreground)]")}>
                  {t === "sessions" ? "Gần đây" : t === "peers" ? "Bạn bè" : "Nhóm"}
                </button>
              ))}
            </div>
            <div className="max-h-[400px] overflow-y-auto divide-y divide-[color:var(--line)]">
              {activeTab === "sessions" && sessions.map(s => {
                const k = sessionListRowKey(s);
                const active = selectedKey === k;
                return (
                  <button key={k} onClick={() => { setSelectedKey(k || ""); setSendTo(guessSendTargetFromSession(s) || ""); }} className={cn("w-full px-4 py-3 text-left transition-all relative", active ? "bg-emerald-500/5" : "hover:bg-zinc-50")}>
                    {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />}
                    <div className="flex justify-between items-start mb-0.5"><span className={cn("text-sm font-bold truncate", active ? "text-emerald-700" : "")}>{sessionChatTitle(s)}</span></div>
                    <p className="text-[11px] text-[color:var(--muted)] truncate opacity-80">{s.lastMessagePreview || "Không có nội dung"}</p>
                  </button>
                );
              })}
              {activeTab === "peers" && peers.map(p => (
                <button key={p.id} onClick={() => { setSelectedKey(`zalouser-peer-${p.id}`); setSendTo(p.id); }} className={cn("w-full px-4 py-3 text-left hover:bg-zinc-50 flex items-center gap-3", selectedKey === `zalouser-peer-${p.id}` && "bg-emerald-500/5")}>
                  <div className="h-8 w-8 rounded-full bg-zinc-200 flex items-center justify-center text-[10px] font-black">{p.name?.charAt(0)}</div>
                  <div className="min-w-0"><p className="text-sm font-bold truncate leading-none mb-1">{p.name}</p><p className="text-[10px] text-[color:var(--muted)]">ID: {p.id}</p></div>
                </button>
              ))}
              {activeTab === "groups" && groups.map(g => (
                <button key={g.id} onClick={() => { setSelectedKey(`zalouser-group-${g.id}`); setSendTo(g.id); }} className={cn("w-full px-4 py-3 text-left hover:bg-zinc-50 flex items-center gap-3", selectedKey === `zalouser-group-${g.id}` && "bg-emerald-500/5")}>
                  <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center text-[10px] font-black text-blue-600">GP</div>
                  <div className="min-w-0"><p className="text-sm font-bold truncate leading-none mb-1">{g.name}</p><p className="text-[10px] text-[color:var(--muted)]">ID: {g.id}</p></div>
                </button>
              ))}
            </div>
          </Card>
        </aside>

        <section className="flex flex-col lg:col-span-8 rounded-3xl border border-[color:var(--line)] bg-[color:var(--surface)] shadow-xl overflow-hidden min-h-[600px]">
          {!selectedKey ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-50 space-y-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <p className="text-xs font-black uppercase tracking-widest">Chọn một hội thoại để bắt đầu</p>
            </div>
          ) : (
            <>
              <header className="px-6 py-4 border-b border-[color:var(--line)] bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black tracking-tight">{selectedRow ? sessionChatTitle(selectedRow) : (activeTab === "peers" ? peers.find(p => `zalouser-peer-${p.id}` === selectedKey)?.name : activeTab === "groups" ? groups.find(g => `zalouser-group-${g.id}` === selectedKey)?.name : selectedKey)}</h2>
                  <div className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-emerald-500" /><span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Trực tiếp</span></div>
                </div>
                <Button size="sm" variant="ghost" className="h-9 w-9 p-0 rounded-full" onClick={() => setSelectedKey("")}><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></Button>
              </header>
              <div ref={threadScrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-zinc-50/30 dark:bg-zinc-900/10">
                {threadLines.length === 0 ? <p className="text-center opacity-30 text-[10px] font-black uppercase mt-20">Trống</p> : threadLines.map(l => <ChatBubble key={l.id} line={l} labelThem={messages.bubbleThem} labelYou={messages.bubbleYou} labelNote={messages.bubbleNote} />)}
              </div>
              <footer className="p-4 bg-white dark:bg-zinc-900 border-t border-[color:var(--line)]">
                <div className="mb-3 flex items-center justify-between px-1"><span className="text-[10px] font-black uppercase tracking-widest text-[color:var(--muted)]">Soạn tin nhắn</span><Badge variant="outline" className="text-[9px] font-bold border-emerald-500/20 text-emerald-600 bg-emerald-500/5">Gửi tới: {sendTo}</Badge></div>
                <div className="relative bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-[color:var(--line)] focus-within:border-emerald-500/50 transition-all">
                  <textarea ref={inputRef} rows={3} className="w-full bg-transparent px-4 py-3 text-sm focus:outline-none resize-none pr-14" placeholder="Nhập nội dung..." value={sendText} onChange={e => setSendText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }} />
                  <div className="absolute right-2 bottom-2">
                    <Button size="sm" className="h-10 w-10 p-0 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20" disabled={isPending || !sendTo.trim() || !sendText.trim()} onClick={handleSend}>
                      {isPending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rotate-45 -translate-y-0.5 -translate-x-0.5"><line x1="22" y1="2" x2="11" y2="13"/><polyline points="22 2 15 22 11 13 2 9 22 2"/></svg>}
                    </Button>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between px-1"><p className="text-[9px] font-bold text-[color:var(--muted)] uppercase tracking-tight"><span className="text-emerald-600">Enter</span> Gửi • <span className="text-emerald-600">Shift+Enter</span> Xuống dòng</p>{sendFlash && <span className="text-[10px] font-black text-emerald-600 uppercase animate-bounce">Thành công!</span>}</div>
              </footer>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
