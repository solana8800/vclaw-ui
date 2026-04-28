"use client";

import { useState, useCallback, useTransition, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn, foldLocaleSearchString } from "@/lib/shared";
import {
  syncZalouserStatus,
  logoutZalouser,
  getZalouserGroups,
  getZalouserPeers,
  prepareZalouserLoginSession,
  sendZalouserMessage,
  sendChannelMessage,
  getZalouserMessages,
  syncZalouserConversationFromGatewayHistory,
  saveZalouserIncomingMessage,
} from "@/lib/zalouser/zalouser-cli-actions";
import { gatewayWs, getPublicGatewayAuthToken } from "@/lib/gateway/client";
import {
  openclawSessionsMessagesSubscribe,
  openclawSessionsMessagesUnsubscribe,
  openclawWebLoginStart,
  openclawWebLoginWait,
} from "@/lib/zalouser/zalouser-gateway";
import { buildZalouserChatHeader } from "@/lib/zalouser/zalouser-chat-header";
import { formatZalouserSyncFeedback } from "@/lib/zalouser/zalouser-sync-feedback";
import type { ZalouserPanelMessages } from "@/lib/zalouser/zalouser-openclaw-messages";

function extractWebLoginQrPayload(payload: unknown): { url: string; message: string } {
  if (!payload || typeof payload !== "object") {
    return { url: "", message: "" };
  }
  const p = payload as Record<string, unknown>;
  const msg = typeof p.message === "string" ? p.message : "";
  const raw = p.qrDataUrl;
  const url = typeof raw === "string" ? raw.trim() : "";
  return { url, message: msg };
}

function extractWebLoginWaitPayload(payload: unknown): { connected: boolean; message: string } {
  if (!payload || typeof payload !== "object") {
    return { connected: false, message: "" };
  }
  const p = payload as Record<string, unknown>;
  return {
    connected: p.connected === true,
    message: typeof p.message === "string" ? p.message : "",
  };
}

type OpenclawZalouserPanelContent = {
  zalouserPanel?: Partial<ZalouserPanelMessages>;
};

type ChatMessageRow = {
  id: string;
  direction: string;
  body: string;
  createdAt: Date | string;
};

type SyncFeedbackTone = "success" | "warning";

type ChatSyncResult = {
  success: boolean;
  inserted: number;
  skipped: number;
  historyCount: number;
  sessionKey?: string;
  error?: string;
};

function zalouserSessionKeyForTarget(target: string): string {
  return `agent:main:zalouser:${target.trim()}`;
}

export function OpenclawZalouserPanel({
  messages,
  initialDbState
}: {
  messages: OpenclawZalouserPanelContent;
  initialDbState?: {
    isLinked: boolean;
    displayName: string | null;
    avatarUrl?: string | null;
    connectedAt: Date | null;
  }
}) {
  const [isPending, startTransition] = useTransition();

  const [connected, setConnected] = useState(initialDbState?.isLinked ?? false);
  const [gatewayAccount, setGatewayAccount] = useState<{ displayName: string | null; linked: boolean; avatarUrl?: string | null }>({
    displayName: initialDbState?.displayName ?? null,
    linked: initialDbState?.isLinked ?? false,
    avatarUrl: initialDbState?.avatarUrl ?? null
  });

  const [groups, setGroups] = useState<{ id: string; name: string; memberCount?: number | null }[]>([]);
  const [peers, setPeers] = useState<{ id: string; name: string; avatarUrl?: string | null }[]>([]);
  const [groupNameFilter, setGroupNameFilter] = useState("");
  const [peerNameFilter, setPeerNameFilter] = useState("");
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [sendTo, setSendTo] = useState<string>("");
  const [sendText, setSendText] = useState("");
  const [sendFlash, setSendFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<{ tone: SyncFeedbackTone; message: string } | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessageRow[]>([]);
  const [isSyncingMessages, setIsSyncingMessages] = useState(false);
  const [activeProvider, setActiveProvider] = useState<string>("zalouser");
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Login QR — chỉ từ Gateway `web.login.start` (data URL), không spawn CLI
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrGeneratedAtMs, setQrGeneratedAtMs] = useState<number | null>(null);
  const [isAwaitingQrScan, setIsAwaitingQrScan] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const gatewayToken = getPublicGatewayAuthToken();

  useEffect(() => {
    if (!gatewayToken) return;
    gatewayWs.connect({ token: gatewayToken });
  }, [gatewayToken]);

  const loadGroups = useCallback(async (force = false) => {
    try {
      const gRes = await getZalouserGroups(force);
      if (gRes.success) setGroups(gRes.groups);
    } catch (e) {
      console.error("Group load error:", e);
    }
  }, []);

  const loadPeers = useCallback(async (force = false) => {
    try {
      const pRes = await getZalouserPeers(force);
      if (pRes.success) setPeers(pRes.peers);
    } catch (e) {
      console.error("Peers load error:", e);
    }
  }, []);

  // Load status
  const handleCheckStatus = useCallback(async () => {
    setError(null);
    try {
      const res = await syncZalouserStatus();
      if (res.success) {
        setGatewayAccount({ 
          displayName: res.displayName || null, 
          linked: res.isLinked || false,
          avatarUrl: "avatarUrl" in res && typeof res.avatarUrl === "string" ? res.avatarUrl : null
        });
        setConnected(res.isLinked || false);
        
        if (!res.isLinked && res.error) {
          console.log("[Zalo UI] Setting status message:", res.error);
          // Nếu đang có mã QR mà check báo chưa có session, tức là chưa quét xong
          // Ta giữ nguyên mã QR để user quét tiếp, chỉ hiện thông báo nhắc nhở
          if (res.error.toLowerCase().includes("no saved zalo session") && qrDataUrl) {
            setError("Vui lòng quét mã QR phía dưới và nhấn 'Làm mới kết nối' để hoàn tất.");
          } else {
            setError(res.error);
            // Nếu gặp lỗi nghiêm trọng (không phải đang chờ quét), mới xóa QR
            if (!res.error.includes("Đang chờ quét")) {
              setQrDataUrl(null);
              setQrGeneratedAtMs(null);
            }
          }
        }

        if (res.isLinked) {
          setQrDataUrl(null);
          setQrGeneratedAtMs(null);
          loadGroups();
          loadPeers();
        } else {
          setGroups([]);
          setPeers([]);
        }
      } else {
        setGatewayAccount({ displayName: null, linked: false });
        setConnected(false);
        setGroups([]);
        setPeers([]);
        setError(res.error || "Cannot connect to OpenClaw Zalo CLI");
      }
    } catch (e) {
      setConnected(false);
      setGroups([]);
      setPeers([]);
      setError(String(e));
    }
  }, [loadGroups, loadPeers, qrDataUrl]);

  const loadMessages = useCallback(async (targetId: string, provider: string): Promise<ChatSyncResult | null> => {
    if (!targetId) return null;
    try {
      const title =
        groups.find((g) => g.id === targetId)?.name ||
        (targetId.startsWith("group:") ? `Nhóm ${targetId.replace(/^group:/i, "").trim()}` : null);
      
      const syncResult = await syncZalouserConversationFromGatewayHistory(targetId, title);
      const res = await getZalouserMessages(targetId, provider);
      if (res.success) {
        setChatMessages(res.messages || []);
      }
      return syncResult;
    } catch (e) {
      console.error("Message load error:", e);
      return null;
    }
  }, [groups]);

  // Initial load groups if already linked
  useEffect(() => {
    if (connected) {
      void Promise.resolve().then(() => {
        void loadGroups();
        void loadPeers();
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (sendTo) {
      void Promise.resolve().then(() => setSyncFeedback(null));
      void Promise.resolve().then(() => loadMessages(sendTo, activeProvider));
    } else {
      void Promise.resolve().then(() => setSyncFeedback(null));
      void Promise.resolve().then(() => setChatMessages([]));
    }
  }, [sendTo, loadMessages, activeProvider]);

  useEffect(() => {
    if (!sendTo || !gatewayToken.trim()) return;
    const sessionKey = `agent:main:${activeProvider}:${sendTo.trim()}`;
    let cancelled = false;

    const off = gatewayWs.on("session.message", (payload) => {
      console.log("[Zalo WS] Nhận tin nhắn mới:", payload);
      const p = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
      const incomingSessionKey = typeof p.sessionKey === "string" ? p.sessionKey : "";
      
      // Chỉ xử lý nếu tin nhắn thuộc về hội thoại đang mở
      if (incomingSessionKey !== sessionKey) return;
      
      void (async () => {
        if (cancelled) return;
        // Lưu tin nhắn vào DB ngay khi nhận được qua WS
        await saveZalouserIncomingMessage(p);
        await loadMessages(sendTo, activeProvider);
      })();
    });

    console.log(`[Zalo UI] Đang subscribe tin nhắn cho session: ${sessionKey}`);
    void openclawSessionsMessagesSubscribe(sessionKey).then((res) => {
      console.log("[Zalo UI] Subscribe thành công:", res);
    }).catch((e) => {
      console.warn("[Zalo UI] Không subscribe được tin nhắn:", e);
    });

    return () => {
      cancelled = true;
      off();
      void openclawSessionsMessagesUnsubscribe(sessionKey).catch(() => undefined);
    };
  }, [gatewayToken, loadMessages, sendTo]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Sau khi có QR: poll `web.login.wait` (không gọi lại start) cho tới khi Gateway báo connected, rồi đồng bộ DB/UI.

  useEffect(() => {
    if (!qrDataUrl || connected || !gatewayToken.trim()) {
      void Promise.resolve().then(() => setIsAwaitingQrScan(false));
      return;
    }
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) setIsAwaitingQrScan(true);
    });
    const wallDeadline = Date.now() + 15 * 60_000;

    void (async () => {
      while (!cancelled && Date.now() < wallDeadline) {
        try {
          const payload = await openclawWebLoginWait({ timeoutMs: 55_000 });
          if (cancelled) break;

          const { connected: loginOk, message } = extractWebLoginWaitPayload(payload);
          if (loginOk) {
            setIsAwaitingQrScan(false);
            setError(null);
            await handleCheckStatus();
            return;
          }

          const lower = message.toLowerCase();
          const stillWaiting = lower.includes("still waiting");
          const fatal =
            !stillWaiting &&
            (lower.includes("expired") ||
              lower.includes("declined") ||
              lower.includes("login failed") ||
              lower.includes("no active zalo qr login"));

          if (fatal) {
            setError(message || "Đăng nhập QR không thành công.");
            setQrDataUrl(null);
            setQrGeneratedAtMs(null);
            setIsAwaitingQrScan(false);
            return;
          }
        } catch (e) {
          if (!cancelled) {
            setError(e instanceof Error ? e.message : String(e));
            setIsAwaitingQrScan(false);
          }
          return;
        }
      }

      if (cancelled) {
        setIsAwaitingQrScan(false);
        return;
      }
      setError("Hết thời gian chờ quét mã trên điện thoại. Vui lòng lấy mã QR mới.");
      setQrDataUrl(null);
      setQrGeneratedAtMs(null);
      setIsAwaitingQrScan(false);
    })();

    return () => {
      cancelled = true;
      setIsAwaitingQrScan(false);
    };
  }, [qrDataUrl, connected, gatewayToken, handleCheckStatus]);

  const handleStartLogin = useCallback(() => {
    startTransition(async () => {
      setError(null);
      setIsGeneratingQr(true);
      setQrDataUrl(null);
      setQrGeneratedAtMs(null);
      try {
        if (!gatewayToken.trim()) {
          setError(
            "Thiếu NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN — cần token để kết nối WebSocket và gọi web.login.start.",
          );
          return;
        }

        const prep = await prepareZalouserLoginSession();
        if (!prep.success) {
          setError(prep.error || "Không thể chuẩn bị phiên đăng nhập");
          return;
        }

        // timeoutMs lớn: startZaloQrLogin poll tối đa ~timeout; QR có thể tới muộn hơn vòng chờ mặc định 30s.
        let payload = await openclawWebLoginStart({ force: true, timeoutMs: 60_000 });
        let { url, message } = extractWebLoginQrPayload(payload);

        // Phiên QR vẫn chạy nhưng chưa kịp có ảnh: gọi lại start với force=false để tiếp tục chờ (zalo-js tái dùng active login).
        if (
          !url &&
          /still preparing|call wait|continue checking/i.test(message)
        ) {
          await new Promise((r) => setTimeout(r, 600));
          payload = await openclawWebLoginStart({ force: false, timeoutMs: 55_000 });
          ({ url, message } = extractWebLoginQrPayload(payload));
        }

        if (!url) {
          setError(
            message
              ? `Chưa nhận được mã QR: ${message}`
              : "Gateway không trả qrDataUrl. Kiểm tra plugin zalouser (gatewayMethods + loginWithQrStart) và RPC web.login.start.",
          );
          return;
        }
        setQrDataUrl(url);
        setQrGeneratedAtMs(Date.now());
      } catch (e: unknown) {
        const msg =
          e && typeof e === "object" && "message" in e
            ? String((e as { message: unknown }).message)
            : String(e);
        setError(msg || "web.login.start thất bại");
      } finally {
        setIsGeneratingQr(false);
      }
    });
  }, [gatewayToken]);

  const handleSend = useCallback(() => {
    const txt = sendText.trim();
    if (!txt || !sendTo) return;
    startTransition(async () => {
      const res = await sendChannelMessage(sendTo, txt, activeProvider);
      if (res.success) {
        // Tạm thời append vào UI để mượt
        setChatMessages(prev => [...prev, {
          id: `temp-${Date.now()}`,
          direction: "STAFF",
          body: txt,
          createdAt: new Date()
        }]);
        await loadMessages(sendTo, activeProvider);
        setSendText("");
        setSendFlash(true);
        setTimeout(() => setSendFlash(false), 2000);
      } else {
        setError(res.error || "Không thể gửi tin nhắn");
      }
    });
  }, [sendText, sendTo, loadMessages]);

  const handleSyncMessages = useCallback(async () => {
    if (!sendTo) return;
    setError(null);
    setSyncFeedback(null);
    setIsSyncingMessages(true);
    try {
      await handleCheckStatus();
      await loadGroups(true);
      await loadPeers(true);
      const syncResult = await loadMessages(sendTo, activeProvider);
      if (!syncResult) {
        setError("Không đọc được kết quả đồng bộ hội thoại.");
        return;
      }
      if (!syncResult.success) {
        setError(syncResult.error || "Không đồng bộ được lịch sử hội thoại từ Gateway.");
        return;
      }
      setSyncFeedback({
        tone: syncResult.historyCount > 0 ? "success" : "warning",
        message: formatZalouserSyncFeedback(syncResult),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsSyncingMessages(false);
    }
  }, [handleCheckStatus, loadGroups, loadPeers, loadMessages, sendTo]);

  const normalizeGroupTarget = (value: string) => value.replace(/^group:/i, "").trim();

  const foldedGroupQuery = useMemo(
    () => foldLocaleSearchString(groupNameFilter),
    [groupNameFilter],
  );
  const foldedPeerQuery = useMemo(() => foldLocaleSearchString(peerNameFilter), [peerNameFilter]);

  const filteredGroups = useMemo(() => {
    if (!foldedGroupQuery) return groups;
    return groups.filter((g) =>
      foldLocaleSearchString(g.name).includes(foldedGroupQuery),
    );
  }, [groups, foldedGroupQuery]);

  const filteredPeers = useMemo(() => {
    if (!foldedPeerQuery) return peers;
    return peers.filter((p) => foldLocaleSearchString(p.name).includes(foldedPeerQuery));
  }, [peers, foldedPeerQuery]);

  const nameFilterPh =
    messages?.zalouserPanel?.nameFilterPlaceholder ?? "Lọc theo tên (có dấu / không dấu)…";
  const nameFilterNoMatch =
    messages?.zalouserPanel?.nameFilterNoMatch ?? "Không có mục nào khớp bộ lọc.";

  const chatHeader = buildZalouserChatHeader({
    selectedKey,
    sendTo,
    groups,
    peers,
  });
  const sendToDisplay =
    chatHeader.title ||
    (sendTo.startsWith("group:") ? `Nhóm ${normalizeGroupTarget(sendTo)}` : sendTo);

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-soft)]/60 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "h-2 w-2 shrink-0 rounded-full",
              connected
                ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.45)]"
                : "bg-[color:var(--muted)]/40",
            )}
            aria-hidden
          />
          <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
            {connected ? "Trạng thái: đang trực tuyến" : "Trạng thái: chưa kết nối"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-[color:var(--surface)] p-1 rounded-xl border border-[color:var(--line)]">
            <button 
              onClick={() => { setActiveProvider("zalouser"); setSelectedKey(""); setSendTo(""); }}
              className={cn(
                "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                activeProvider === "zalouser" 
                  ? "bg-[color:var(--brand)] text-white shadow-sm" 
                  : "text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
              )}
            >
              Zalo
            </button>
            <button 
              onClick={() => { setActiveProvider("telegram"); setSelectedKey(""); setSendTo(""); }}
              className={cn(
                "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                activeProvider === "telegram" 
                  ? "bg-sky-600 text-white shadow-sm" 
                  : "text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
              )}
            >
              Telegram
            </button>
          </div>
          <Button
            disabled={isPending}
            variant="outline"
            size="sm"
            onClick={() => startTransition(handleCheckStatus)}
            className="h-8 cursor-pointer text-xs font-semibold"
          >
            Làm mới kết nối
          </Button>
        </div>
      </div>

      {error && (
        <div className={cn(
          "p-4 rounded-xl border text-sm font-medium animate-in fade-in slide-in-from-top-2",
          String(error || "").includes("Đang chờ quét") 
            ? "border-amber-500/20 bg-amber-500/10 text-amber-600" 
            : "border-red-500/20 bg-red-500/10 text-red-600"
        )}>
          {error}
        </div>
      )}

      <div className="grid min-h-[560px] gap-5 lg:min-h-[600px] lg:grid-cols-12 lg:gap-6">
        <aside className="flex flex-col gap-5 lg:col-span-4 lg:gap-6">
          {connected ? (
            <Card className="relative overflow-hidden border-[color:var(--line)] bg-[color:var(--surface)] shadow-[0_24px_60px_-40px_var(--shadow-color)]">
              <div
                className="absolute inset-x-0 top-0 h-1 bg-[image:var(--brand-gradient)] opacity-90"
                aria-hidden
              />
              <CardHeader className="flex flex-row items-center justify-between border-b border-[color:var(--line)] pb-3 pt-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold text-[color:var(--foreground-strong)]">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" aria-hidden />
                    {messages?.zalouserPanel?.stripZaloLinked || "Zalo đã sẵn sàng"}
                  </CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    startTransition(async () => {
                      try {
                        await logoutZalouser();
                        await handleCheckStatus();
                      } catch (e) {
                        setError(String(e));
                      }
                    });
                  }}
                  disabled={isPending}
                  className="cursor-pointer text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:hover:bg-red-950/30"
                >
                  {messages?.zalouserPanel?.logout || "Thoát Zalo"}
                </Button>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center pt-5">
                  {gatewayAccount.avatarUrl ? (
                    <div className="mb-3 h-16 w-16 overflow-hidden rounded-full border-2 border-[color:var(--line)] shadow-sm">
                      <img src={gatewayAccount.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[color:var(--line)] bg-[color:var(--brand-softer)] text-[color:var(--brand-strong)] shadow-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    </div>
                  )}
                  <p className="text-center text-lg font-semibold tracking-tight text-[color:var(--foreground-strong)]">
                    {gatewayAccount.displayName || "Zalo User"}
                  </p>
                  <p className="mt-1 text-center text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Đang hoạt động
                  </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="relative overflow-hidden border-[color:var(--line)] bg-[color:var(--surface)] shadow-[0_24px_60px_-40px_var(--shadow-color)]">
              <div
                className="absolute inset-x-0 top-0 h-0.5 bg-[color:var(--line-strong)]"
                aria-hidden
              />
              <CardHeader className="border-b border-[color:var(--line)] pb-3 text-center">
                <CardTitle className="text-sm font-semibold text-[color:var(--foreground-strong)]">
                  {messages?.zalouserPanel?.stripZaloNotLinked || "Chưa đăng nhập Zalo"}
                </CardTitle>
                <p className="mt-1 text-xs leading-relaxed text-[color:var(--muted)]">
                  {messages?.zalouserPanel?.loginIntro || "Sử dụng ứng dụng Zalo trên điện thoại để quét mã QR bên dưới."}
                </p>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center space-y-6 pb-8 pt-8">
                <Button
                  disabled={isPending || isGeneratingQr}
                  onClick={handleStartLogin}
                  size="lg"
                  variant="primary"
                  className="cursor-pointer rounded-2xl px-8 py-6 font-semibold shadow-[0_20px_50px_-24px_var(--brand-glow)] transition-[filter] duration-200 hover:brightness-105"
                >
                  {isGeneratingQr ? (
                    <span className="flex items-center gap-2">
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Đang lấy mã QR mới...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><rect x="7" y="7" width="3" height="3"/><rect x="14" y="7" width="3" height="3"/><rect x="7" y="14" width="3" height="3"/><rect x="14" y="14" width="3" height="3"/></svg>
                      {qrDataUrl ? "Lấy mã QR mới" : (messages?.zalouserPanel?.startLogin || "Bắt đầu đăng nhập")}
                    </span>
                  )}
                </Button>

                {qrDataUrl && (
                  <div className="relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[color:var(--line)] bg-[color:var(--surface-soft)] p-4 transition-all duration-300 dark:bg-[color:var(--surface)]/80">
                    <img
                      src={qrDataUrl}
                      alt="QR Zalo"
                      onLoad={() => {
                        if (isGeneratingQr) setIsGeneratingQr(false);
                      }}
                      className={cn(
                        "h-48 w-48 object-contain transition-all duration-300",
                        isGeneratingQr ? "opacity-10 grayscale blur-sm scale-95" : "opacity-100 scale-100",
                      )}
                    />
                    {isGeneratingQr && (
                       <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold uppercase tracking-wide text-[color:var(--brand-strong)]">Đang khởi tạo...</div>
                    )}
                  </div>
                )}

                {qrDataUrl && qrGeneratedAtMs && !isGeneratingQr && (
                  <div className="text-center space-y-2">
                    <p className="inline-block rounded-full bg-[color:var(--brand-softer)] px-4 py-1.5 text-[10px] font-semibold text-[color:var(--brand-strong)]">
                      Mã QR tạo lúc: {new Date(qrGeneratedAtMs).toLocaleString("vi-VN")}
                    </p>
                    {isAwaitingQrScan && (
                      <p className="mx-auto max-w-xs rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-[10px] font-medium text-blue-700 dark:text-blue-300">
                        Đang chờ xác nhận trên Zalo… Giao diện sẽ tự cập nhật sau khi đăng nhập xong (không cần nhấn Làm mới).
                      </p>
                    )}
                    <p className="text-[10px] font-medium text-[color:var(--muted)]">
                      Nếu mã QR hết hạn hoặc không quét được, vui lòng nhấn nút <b>Lấy mã QR mới</b> ở trên.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="flex flex-1 flex-col overflow-hidden border-[color:var(--line)] shadow-[0_20px_50px_-40px_var(--shadow-color)]">
            <div className="flex items-center justify-between border-b border-[color:var(--line)] bg-[color:var(--surface-soft)]/70 p-2">
              <span className="pl-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                Danh sách nhóm
              </span>
              <Button
                size="sm"
                variant="ghost"
                disabled={isPending || !connected}
                onClick={() => startTransition(() => loadGroups(true))}
                className="h-7 cursor-pointer rounded-lg px-2 text-[10px] font-semibold"
              >
                Làm mới
              </Button>
            </div>
            <div className="border-b border-[color:var(--line)] bg-[color:var(--surface)]/80 px-2 py-2">
              <input
                type="search"
                value={groupNameFilter}
                onChange={(e) => setGroupNameFilter(e.target.value)}
                placeholder={nameFilterPh}
                disabled={!connected}
                className="h-8 w-full rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] px-2.5 text-xs placeholder:text-[color:var(--muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/25 disabled:opacity-50"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <div className="max-h-[400px] flex-1 divide-y divide-[color:var(--line)] overflow-y-auto">
              {filteredGroups.map(g => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    setSelectedKey(`zalouser-group-${g.id}`);
                    setSendTo(g.id);
                  }}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors duration-200 hover:bg-[color:var(--brand-softer)]/50",
                    selectedKey === `zalouser-group-${g.id}` &&
                      "border-l-[3px] border-l-[color:var(--brand)] bg-[color:var(--brand-softer)]/35",
                  )}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                    GP
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 truncate text-sm font-semibold leading-none text-[color:var(--foreground-strong)]">
                      {g.name}
                    </p>
                    <div className="flex items-center gap-2">
                      {g.memberCount && (
                        <span className="flex items-center gap-1 whitespace-nowrap rounded-md border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--muted)]">
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                          {g.memberCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
              {groups.length === 0 && (
                <div className="p-8 text-center text-xs font-medium text-[color:var(--muted)]">
                  Không có nhóm nào
                </div>
              )}
              {groups.length > 0 && filteredGroups.length === 0 && (
                <div className="p-6 text-center text-xs font-medium text-[color:var(--muted)]">
                  {nameFilterNoMatch}
                </div>
              )}
            </div>
          </Card>
        </aside>

        <section className="min-h-[560px] overflow-hidden rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-glass)] shadow-[0_32px_70px_-54px_var(--shadow-color)] backdrop-blur lg:col-span-8 lg:min-h-[600px] lg:grid lg:grid-cols-[minmax(0,1fr)_280px] sm:rounded-3xl xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="flex min-h-[560px] flex-col lg:min-h-[600px]">
            {!selectedKey ? (
              <div className="flex flex-1 flex-col items-center justify-center space-y-4 p-12 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[color:var(--muted)]"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <p className="max-w-sm text-xs font-medium uppercase tracking-wide text-[color:var(--muted)]">
                  {messages?.zalouserPanel?.selectChatHint || "Chọn một nhóm bên trái hoặc bạn bè bên phải để xem tin và gửi."}
                </p>
              </div>
            ) : (
              <>
                <header className="flex items-center justify-between border-b border-[color:var(--line)] bg-[color:var(--surface-soft)]/50 px-4 py-3 backdrop-blur-md sm:px-6 sm:py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    {chatHeader.avatarUrl ? (
                      <img
                        src={chatHeader.avatarUrl}
                        alt=""
                        className="h-10 w-10 rounded-full border border-[color:var(--line)] object-cover"
                      />
                    ) : (
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-xs font-semibold uppercase",
                          chatHeader.kind === "group"
                            ? "border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-300"
                            : "border-violet-200 bg-violet-100 text-violet-700 dark:border-violet-900/40 dark:bg-violet-950/40 dark:text-violet-300",
                        )}
                      >
                        {chatHeader.fallbackLabel}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold tracking-tight text-[color:var(--foreground-strong)]">
                        {chatHeader.title || selectedKey}
                      </h2>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                        Kênh thông báo
                      </span>
                    </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isPending || isSyncingMessages || !sendTo}
                      onClick={handleSyncMessages}
                      className="h-8 cursor-pointer gap-1.5 rounded-lg px-2 text-[10px] font-semibold text-[color:var(--brand-strong)] hover:bg-[color:var(--brand-softer)]/60"
                    >
                      {isSyncingMessages ? (
                        <>
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                          Đang đồng bộ
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
                          Đồng bộ
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 cursor-pointer rounded-full p-0"
                      onClick={() => {
                        setSelectedKey("");
                        setSendTo("");
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </Button>
                  </div>
                </header>
                {syncFeedback && (
                  <div
                    className={cn(
                      "mx-4 mt-4 rounded-2xl border px-4 py-3 text-xs font-semibold sm:mx-6",
                      syncFeedback.tone === "success"
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
                    )}
                  >
                    {syncFeedback.message}
                  </div>
                )}
                <div
                  ref={chatScrollRef}
                  className="flex flex-1 flex-col space-y-4 overflow-y-auto scroll-smooth bg-[color:var(--surface-soft)]/35 px-4 py-5 sm:px-6 sm:py-6 dark:bg-[color:var(--surface)]/20"
                >
                  {chatMessages.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center space-y-2 text-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-[color:var(--muted)]"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                        Chưa có tin nhắn
                      </p>
                    </div>
                  ) : (
                    chatMessages.map((msg) => (
                      <div 
                        key={msg.id} 
                        className={cn(
                          "flex max-w-[88%] flex-col space-y-1 sm:max-w-[85%]",
                          msg.direction === "OUT" || msg.direction === "STAFF" ? "ml-auto items-end" : "mr-auto items-start"
                        )}
                      >
                        <div
                          className={cn(
                            "whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                            msg.direction === "OUT"
                              ? "rounded-tr-none bg-[image:var(--brand-gradient)] text-[color:var(--brand-contrast)]"
                              : msg.direction === "STAFF"
                              ? "rounded-tr-none bg-emerald-600 text-white dark:bg-emerald-500"
                              : "rounded-tl-none border border-[color:var(--line)] bg-[color:var(--surface)] text-[color:var(--foreground-strong)]",
                          )}
                        >
                          {(() => {
                            let body = typeof msg.body === "string" ? msg.body.trim() : "";
                            
                            // Làm sạch metadata cho cả các tin cũ trong DB
                            body = body
                              .replace(/Conversation info \(untrusted metadata\):[\s\S]*?```json[\s\S]*?```/gi, "")
                              .replace(/Sender \(untrusted metadata\):[\s\S]*?```json[\s\S]*?```/gi, "")
                              .trim();

                            // 1. Kiểm tra nếu là Sticker Zalo
                            let stickerData = null;
                            if (body.startsWith("(Khách hàng vừa gửi Sticker cảm xúc")) {
                              try {
                                const raw = JSON.parse((msg as any).rawPayloadJson || "{}");
                                // Tìm sticker JSON trong content hoặc text của payload gốc
                                const rawText = raw.text || (Array.isArray(raw.content) ? raw.content[0]?.text : "");
                                if (rawText && rawText.startsWith("{")) {
                                  stickerData = JSON.parse(rawText);
                                }
                              } catch (e) { /* Lỗi parse raw */ }
                            } else if (body.startsWith("{") && body.endsWith("}")) {
                              try { stickerData = JSON.parse(body); } catch (e) { /* Không phải JSON */ }
                            }

                            if (stickerData && stickerData.id !== undefined && stickerData.catId !== undefined) {
                              const eid = stickerData.id;
                              return (
                                <img 
                                  src={`https://zalo-api.zadn.vn/api/emoticon/sticker/webpc?eid=${eid}&size=130`}
                                  alt="Zalo Sticker"
                                  className="h-28 w-28 object-contain"
                                />
                              );
                            }

                            // 2. Kiểm tra nếu là Image URL
                            if (body.startsWith("http") && (body.toLowerCase().includes(".jpg") || body.toLowerCase().includes(".png") || body.toLowerCase().includes(".jpeg") || body.toLowerCase().includes(".webp"))) {
                              return (
                                <div className="mt-1 overflow-hidden rounded-lg">
                                  <img 
                                    src={body} 
                                    alt="Zalo Image" 
                                    className="max-h-64 max-w-full cursor-pointer object-cover transition-transform hover:scale-[1.02]"
                                    onClick={() => window.open(body, "_blank")}
                                  />
                                </div>
                              );
                            }

                            // 2. Kiểm tra nếu là tin nhắn có bọc Rule bán hàng
                            if (body.startsWith("(Khách hàng nhắn: \"")) {
                              const match = body.match(/\(Khách hàng nhắn: "([\s\S]*?)". RULE:/);
                              const cleanContent = match ? match[1] : body;
                              return <div className="whitespace-pre-wrap">{cleanContent}</div>;
                            }

                            // 3. Mặc định là Text
                            if (body.startsWith("(")) {
                              return <div className="italic opacity-70 text-sm">{body}</div>;
                            }
                            return <span className="whitespace-pre-wrap">{body || String(msg.body ?? "")}</span>;
                          })()}
                        </div>
                        <span className="px-1 text-[9px] font-medium uppercase tracking-tight text-[color:var(--muted)]">
                          {new Date(msg.createdAt).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
                <footer className="border-t border-[color:var(--line)] bg-[color:var(--surface)] p-4 sm:p-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-0.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                      Soạn tin nhắn
                    </span>
                    <Badge
                      variant="outline"
                      className="max-w-[200px] truncate border-[color:var(--brand-soft)] bg-[color:var(--brand-softer)]/40 text-[9px] font-semibold text-[color:var(--brand-strong)] sm:max-w-xs"
                    >
                      Gửi tới: {sendToDisplay || "Chưa chọn nhóm"}
                    </Badge>
                  </div>
                  <div className="relative rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-soft)]/50 transition-colors focus-within:border-[color:var(--brand)]/40 focus-within:ring-2 focus-within:ring-[color:var(--brand)]/15">
                    <textarea ref={inputRef} rows={3} className="w-full resize-none bg-transparent px-4 py-3 pr-14 text-sm focus:outline-none" placeholder="Nhập nội dung thông báo..." value={sendText} onChange={e => setSendText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }} />
                    <div className="absolute bottom-2 right-2">
                      <Button
                        size="sm"
                        className="h-10 w-10 cursor-pointer rounded-xl p-0 shadow-md"
                        disabled={isPending || !sendTo.trim() || !sendText.trim()}
                        onClick={handleSend}
                      >
                        {isPending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-[color:var(--brand-contrast)] border-t-transparent" /> : <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="-translate-x-0.5 -translate-y-0.5 rotate-45"><line x1="22" y1="2" x2="11" y2="13"/><polyline points="22 2 15 22 11 13 2 9 22 2"/></svg>}
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-0.5">
                    <p className="text-[9px] font-medium uppercase tracking-tight text-[color:var(--muted)]">
                      <span className="text-[color:var(--brand-strong)]">Enter</span> gửi ·{" "}
                      <span className="text-[color:var(--brand-strong)]">Shift+Enter</span> xuống dòng
                    </p>
                    {sendFlash ? (
                      <span className="text-[10px] font-semibold uppercase text-[color:var(--brand-strong)]">
                        Đã gửi
                      </span>
                    ) : null}
                  </div>
                </footer>
              </>
            )}
          </div>

          <aside className="border-t border-[color:var(--line)] bg-[color:var(--surface-soft)]/30 lg:border-l lg:border-t-0 dark:bg-[color:var(--surface)]/15">
            <div className="flex items-center justify-between border-b border-[color:var(--line)] bg-[color:var(--surface-soft)]/70 p-2">
              <span className="pl-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                {messages?.zalouserPanel?.peersListTitle || "Danh sách bạn bè"}
              </span>
              <Button
                size="sm"
                variant="ghost"
                disabled={isPending || !connected}
                onClick={() => startTransition(() => loadPeers(true))}
                className="h-7 cursor-pointer rounded-lg px-2 text-[10px] font-semibold"
              >
                {messages?.zalouserPanel?.peersRefresh || "Làm mới"}
              </Button>
            </div>
            <div className="border-b border-[color:var(--line)] bg-[color:var(--surface)]/80 px-2 py-2">
              <input
                type="search"
                value={peerNameFilter}
                onChange={(e) => setPeerNameFilter(e.target.value)}
                placeholder={nameFilterPh}
                disabled={!connected}
                className="h-8 w-full rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] px-2.5 text-xs placeholder:text-[color:var(--muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/25 disabled:opacity-50"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <div className="max-h-[560px] divide-y divide-[color:var(--line)] overflow-y-auto lg:max-h-[600px]">
              {filteredPeers.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedKey(`zalouser-peer-${p.id}`);
                    setSendTo(p.id);
                  }}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors duration-200 hover:bg-[color:var(--brand-softer)]/50",
                    selectedKey === `zalouser-peer-${p.id}` &&
                      "border-l-[3px] border-l-[color:var(--brand)] bg-[color:var(--brand-softer)]/35",
                  )}
                >
                  {p.avatarUrl ? (
                    <img
                      src={p.avatarUrl}
                      alt=""
                      className="h-8 w-8 shrink-0 rounded-full object-cover border border-[color:var(--line)]"
                    />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-[10px] font-bold text-violet-700 dark:text-violet-300">
                      DM
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold leading-none text-[color:var(--foreground-strong)]">
                      {p.name}
                    </p>
                  </div>
                </button>
              ))}
              {peers.length === 0 && (
                <div className="p-6 text-center text-xs font-medium text-[color:var(--muted)]">
                  {messages?.zalouserPanel?.peersEmpty || "Chưa có bạn bè trong danh bạ."}
                </div>
              )}
              {peers.length > 0 && filteredPeers.length === 0 && (
                <div className="p-6 text-center text-xs font-medium text-[color:var(--muted)]">
                  {nameFilterNoMatch}
                </div>
              )}
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
