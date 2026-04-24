"use client";

import { useState, useCallback, useTransition, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  syncZalouserStatus,
  logoutZalouser,
  getZalouserGroups,
  prepareZalouserLoginSession,
  sendZalouserMessage,
  getZalouserMessages,
} from "@/lib/zalouser/zalouser-cli-actions";
import { gatewayWs, getPublicGatewayAuthToken } from "@/lib/gateway-client";
import { openclawWebLoginStart, openclawWebLoginWait } from "@/lib/zalouser/zalouser-gateway";

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

export type ZalouserPanelMessages = any;

export function OpenclawZalouserPanel({
  messages,
  initialDbState
}: {
  messages: ZalouserPanelMessages;
  initialDbState?: { isLinked: boolean; displayName: string | null; connectedAt: Date | null }
}) {
  const [isPending, startTransition] = useTransition();

  const [connected, setConnected] = useState(initialDbState?.isLinked ?? false);
  const [gatewayAccount, setGatewayAccount] = useState<{ displayName: string | null; linked: boolean; avatarUrl?: string | null }>({
    displayName: initialDbState?.displayName ?? null,
    linked: initialDbState?.isLinked ?? false,
    avatarUrl: (initialDbState as any)?.avatarUrl ?? null
  });

  const [groups, setGroups] = useState<{ id: string; name: string; memberCount?: number | null }[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [sendTo, setSendTo] = useState<string>("");
  const [sendText, setSendText] = useState("");
  const [sendFlash, setSendFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
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

  // Load status
  const handleCheckStatus = useCallback(async () => {
    setError(null);
    try {
      const res = await syncZalouserStatus();
      if (res.success) {
        setGatewayAccount({ 
          displayName: res.displayName || null, 
          linked: res.isLinked || false,
          avatarUrl: (res as any).avatarUrl || null
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
        } else {
          setGroups([]);
        }
      } else {
        setGatewayAccount({ displayName: null, linked: false });
        setConnected(false);
        setGroups([]);
        setError(res.error || "Cannot connect to OpenClaw Zalo CLI");
      }
    } catch (e) {
      setConnected(false);
      setGroups([]);
      setError(String(e));
    }
  }, [qrDataUrl]);

  const loadGroups = useCallback(async (force = false) => {
    try {
      const gRes = await getZalouserGroups(force);
      if (gRes.success) setGroups(gRes.groups);
    } catch (e) {
      console.error("Group load error:", e);
    }
  }, []);

  const loadMessages = useCallback(async (targetId: string) => {
    if (!targetId) return;
    try {
      const res = await getZalouserMessages(targetId);
      if (res.success) {
        setChatMessages(res.messages || []);
      }
    } catch (e) {
      console.error("Message load error:", e);
    }
  }, []);

  // Initial load groups if already linked
  useEffect(() => {
    if (connected) {
      loadGroups();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (sendTo) {
      loadMessages(sendTo);
    } else {
      setChatMessages([]);
    }
  }, [sendTo, loadMessages]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Sau khi có QR: poll `web.login.wait` (không gọi lại start) cho tới khi Gateway báo connected, rồi đồng bộ DB/UI.

  useEffect(() => {
    if (!qrDataUrl || connected || !gatewayToken.trim()) {
      setIsAwaitingQrScan(false);
      return;
    }
    let cancelled = false;
    setIsAwaitingQrScan(true);
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
      const res = await sendZalouserMessage(sendTo, txt);
      if (res.success) {
        // Tạm thời append vào UI để mượt
        setChatMessages(prev => [...prev, {
          id: `temp-${Date.now()}`,
          direction: "OUT",
          body: txt,
          createdAt: new Date()
        }]);
        setSendText("");
        setSendFlash(true);
        setTimeout(() => setSendFlash(false), 2000);
      } else {
        setError(res.error || "Không thể gửi tin nhắn");
      }
    });
  }, [sendText, sendTo]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className={cn("h-2 w-2 rounded-full", connected ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-zinc-300")} />
          <span className="text-[10px] font-black uppercase tracking-widest text-[color:var(--muted)]">
            {connected ? "Trạng thái: Đang trực tuyến" : "Trạng thái: Chưa kết nối"}
          </span>
        </div>
        <Button 
          disabled={isPending} 
          variant="ghost" 
          size="sm"
          onClick={() => startTransition(handleCheckStatus)} 
          className="h-7 text-[10px] font-black uppercase tracking-tight px-4 bg-zinc-100 dark:bg-zinc-900 rounded-xl hover:bg-zinc-200 transition-all border border-[color:var(--line)]"
        >
          Làm mới kết nối
        </Button>
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

      <div className="grid lg:grid-cols-12 gap-6 min-h-[600px]">
        <aside className="flex flex-col lg:col-span-4 gap-6">
          {connected ? (
            <Card className="border-[color:var(--line)] shadow-sm bg-emerald-50/50 dark:bg-emerald-950/10">
              <CardHeader className="pb-2 border-b border-[color:var(--line)] flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-black flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    {messages?.zalouserPanel?.stripZaloLinked || "Zalo đã sẵn sàng"}
                  </CardTitle>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { startTransition(async () => { try { await logoutZalouser(); await handleCheckStatus(); } catch (e) { setError(String(e)); } }); }} 
                  disabled={isPending}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 -my-2"
                >
                  {messages?.zalouserPanel?.logout || "Thoát Zalo"}
                </Button>
              </CardHeader>
              <CardContent className="pt-4 flex flex-col items-center justify-center">
                  {gatewayAccount.avatarUrl ? (
                    <div className="w-16 h-16 rounded-full overflow-hidden shadow-sm border-2 border-white dark:border-zinc-800 mb-3">
                      <img src={gatewayAccount.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center mb-3 shadow-sm border-2 border-white dark:border-zinc-800">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    </div>
                  )}
                  <p className="text-lg font-black tracking-tight leading-none text-emerald-800 dark:text-emerald-400 text-center">{gatewayAccount.displayName || "Zalo User"}</p>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-1 text-center">Đang hoạt động</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-[color:var(--line)] shadow-sm bg-zinc-50 dark:bg-zinc-900/30">
              <CardHeader className="pb-2 border-b border-[color:var(--line)] text-center">
                <CardTitle className="text-sm font-black">{messages?.zalouserPanel?.stripZaloNotLinked || "Chưa đăng nhập Zalo"}</CardTitle>
                <p className="text-[11px] text-[color:var(--muted)] mt-1">{messages?.zalouserPanel?.loginIntro || "Sử dụng ứng dụng Zalo trên điện thoại để quét mã QR bên dưới."}</p>
              </CardHeader>
              <CardContent className="pt-8 pb-8 flex flex-col items-center justify-center space-y-6">
                <Button 
                  disabled={isPending || isGeneratingQr} 
                  onClick={handleStartLogin} 
                  className="rounded-2xl shadow-lg shadow-emerald-500/20 font-black px-8 py-6 bg-emerald-600 hover:bg-emerald-700 text-white transition-all hover:scale-105"
                >
                  {isGeneratingQr ? (
                    <span className="flex items-center gap-2">
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Đang lấy mã QR mới...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 text-sm uppercase tracking-wider">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><rect x="7" y="7" width="3" height="3"/><rect x="14" y="7" width="3" height="3"/><rect x="7" y="14" width="3" height="3"/><rect x="14" y="14" width="3" height="3"/></svg>
                      {qrDataUrl ? "Lấy mã QR mới" : (messages?.zalouserPanel?.startLogin || "Bắt đầu đăng nhập")}
                    </span>
                  )}
                </Button>

                {qrDataUrl && (
                  <div className="p-4 rounded-3xl border-2 border-dashed border-[color:var(--line)] bg-white dark:bg-zinc-950 flex flex-col items-center justify-center relative transition-all duration-300">
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
                       <div className="absolute inset-0 flex items-center justify-center font-black text-xs uppercase tracking-widest text-emerald-600">Đang khởi tạo...</div>
                    )}
                  </div>
                )}

                {qrDataUrl && qrGeneratedAtMs && !isGeneratingQr && (
                  <div className="text-center space-y-2">
                    <p className="text-[10px] text-emerald-600 font-bold bg-emerald-500/10 px-4 py-1.5 rounded-full inline-block">
                      Mã QR tạo lúc: {new Date(qrGeneratedAtMs).toLocaleString("vi-VN")}
                    </p>
                    {isAwaitingQrScan && (
                      <p className="text-[10px] font-bold text-blue-600 bg-blue-500/10 px-3 py-2 rounded-xl max-w-xs mx-auto">
                        Đang chờ xác nhận trên Zalo… Giao diện sẽ tự cập nhật sau khi đăng nhập xong (không cần nhấn Làm mới).
                      </p>
                    )}
                    <p className="text-[10px] text-[color:var(--muted)] font-medium">
                      Nếu mã QR hết hạn hoặc không quét được, vui lòng nhấn nút <b>Lấy mã QR mới</b> ở trên.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="border-[color:var(--line)] overflow-hidden flex flex-col flex-1">
            <div className="flex p-2 bg-zinc-100 dark:bg-zinc-900 border-b border-[color:var(--line)] items-center justify-between">
              <span className="text-xs font-black uppercase tracking-widest text-[color:var(--muted)] pl-2">Danh sách nhóm</span>
              <Button size="sm" variant="ghost" disabled={isPending || !connected} onClick={() => startTransition(() => loadGroups(true))} className="h-6 text-[10px] px-2 rounded-lg">Làm mới</Button>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[400px] divide-y divide-[color:var(--line)]">
              {groups.map(g => (
                <button key={g.id} onClick={() => { setSelectedKey(`zalouser-group-${g.id}`); setSendTo(g.id); }} className={cn("w-full px-4 py-3 text-left hover:bg-zinc-50 flex items-center gap-3", selectedKey === `zalouser-group-${g.id}` && "bg-emerald-500/5")}>
                  <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center text-[10px] font-black text-blue-600">GP</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate leading-none mb-1">{g.name}</p>
                    <div className="flex items-center gap-2">
                      {g.memberCount && (
                        <span className="text-[10px] font-black text-zinc-500 bg-zinc-500/5 px-1.5 py-0.5 rounded-md whitespace-nowrap flex items-center gap-1 border border-zinc-500/10">
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                          {g.memberCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
              {groups.length === 0 && (
                <div className="p-8 text-center text-[10px] font-bold text-zinc-400">Không có nhóm nào</div>
              )}
            </div>
          </Card>
        </aside>

        <section className="flex flex-col lg:col-span-8 rounded-3xl border border-[color:var(--line)] bg-[color:var(--surface)] shadow-xl overflow-hidden min-h-[600px]">
          {!selectedKey ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-50 space-y-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <p className="text-xs font-black uppercase tracking-widest">Chọn một nhóm để gửi tin nhắn</p>
            </div>
          ) : (
            <>
              <header className="px-6 py-4 border-b border-[color:var(--line)] bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black tracking-tight">{groups.find(g => `zalouser-group-${g.id}` === selectedKey)?.name || selectedKey}</h2>
                  <div className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-emerald-500" /><span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Kênh thông báo</span></div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    disabled={isPending || !sendTo} 
                    onClick={() => loadMessages(sendTo)} 
                    className="h-8 text-[10px] font-bold px-2 rounded-lg flex items-center gap-1.5 text-emerald-600 hover:bg-emerald-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
                    Đồng bộ
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-full" onClick={() => setSelectedKey("")}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </Button>
                </div>
              </header>
              <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-4 bg-zinc-50/30 dark:bg-zinc-900/10 flex flex-col scroll-smooth">
                {chatMessages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 space-y-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    <p className="text-[10px] font-black uppercase tracking-widest">Chưa có tin nhắn</p>
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={cn(
                        "flex flex-col max-w-[85%] space-y-1",
                        msg.direction === "OUT" ? "ml-auto items-end" : "mr-auto items-start"
                      )}
                    >
                      <div className={cn(
                        "px-4 py-2.5 rounded-2xl text-sm shadow-sm",
                        msg.direction === "OUT" 
                          ? "bg-emerald-600 text-white rounded-tr-none" 
                          : "bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-[color:var(--line)] rounded-tl-none"
                      )}>
                        {msg.body}
                      </div>
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter px-1">
                        {new Date(msg.createdAt).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <footer className="p-4 bg-white dark:bg-zinc-900 border-t border-[color:var(--line)]">
                <div className="mb-3 flex items-center justify-between px-1"><span className="text-[10px] font-black uppercase tracking-widest text-[color:var(--muted)]">Soạn tin nhắn</span><Badge variant="outline" className="text-[9px] font-bold border-emerald-500/20 text-emerald-600 bg-emerald-500/5">Gửi tới: {sendTo}</Badge></div>
                <div className="relative bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-[color:var(--line)] focus-within:border-emerald-500/50 transition-all">
                  <textarea ref={inputRef} rows={3} className="w-full bg-transparent px-4 py-3 text-sm focus:outline-none resize-none pr-14" placeholder="Nhập nội dung thông báo..." value={sendText} onChange={e => setSendText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }} />
                  <div className="absolute right-2 bottom-2">
                    <Button size="sm" className="h-10 w-10 p-0 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20" disabled={isPending || !sendTo.trim() || !sendText.trim()} onClick={handleSend}>
                      {isPending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rotate-45 -translate-y-0.5 -translate-x-0.5"><line x1="22" y1="2" x2="11" y2="13"/><polyline points="22 2 15 22 11 13 2 9 22 2"/></svg>}
                    </Button>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between px-1">
                  <p className="text-[9px] font-bold text-[color:var(--muted)] uppercase tracking-tight"><span className="text-emerald-600">Enter</span> Gửi • <span className="text-emerald-600">Shift+Enter</span> Xuống dòng</p>
                  {sendFlash && <span className="text-[10px] font-black text-emerald-600 uppercase animate-bounce">Đã gửi lệnh thành công!</span>}
                </div>
              </footer>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
