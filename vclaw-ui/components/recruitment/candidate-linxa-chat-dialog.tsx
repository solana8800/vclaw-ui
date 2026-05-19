"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Loader2, MessageSquare, RefreshCw, Sparkles, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/shared";
import type { AdminHhContent } from "@/lib/admin/content";
import {
  fetchCandidateLinxaChatMessages,
  generateAIChatReply,
  sendLinkedInMessageCDP,
  syncLinkedInThreadCDP,
} from "@/lib/recruitment/actions";
import type { LinxaChatMessage } from "@/lib/recruitment/linxa-message-map";
import { refineLinxaMessageDirections } from "@/lib/recruitment/linxa-message-map";
import { toast } from "sonner";

type CandidateLinxaChatDialogProps = {
  open: boolean;
  onClose: () => void;
  candidateId: string;
  candidateName: string;
  linxaChatId?: string | null;
  profileUrl?: string | null;
  messages: AdminHhContent;
  locale: string;
};

function formatMessageTime(sentAt: string | null, locale: string): string {
  if (!sentAt) return "";
  const d = new Date(sentAt);
  if (Number.isNaN(d.getTime())) return sentAt;
  return d.toLocaleString(locale === "vi" ? "vi-VN" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function LinxaChatBubble({
  msg,
  labels,
  locale,
}: {
  msg: LinxaChatMessage;
  labels: {
    fromMe: string;
    fromCandidate: string;
    unknownSender: string;
  };
  locale: string;
}) {
  const isOutbound = msg.direction === "outbound";
  const isUnknown = msg.direction === "unknown";

  if (isUnknown) {
    return (
      <div className="col-span-2 flex justify-center py-0.5">
        <div className="max-w-[90%] rounded-xl border border-dashed border-amber-300/80 bg-amber-50/90 px-3 py-2 text-center">
          <p className="text-[10px] font-medium text-amber-900 mb-0.5">{labels.unknownSender}</p>
          <p className="text-sm whitespace-pre-wrap break-words text-[color:var(--foreground)]">
            {msg.text}
          </p>
          {msg.sentAt ? (
            <p className="text-[10px] text-[color:var(--foreground-muted)] mt-1">
              {formatMessageTime(msg.sentAt, locale)}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "col-span-2 flex w-full",
        isOutbound ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "flex max-w-[min(85%,20rem)] flex-col gap-0.5",
          isOutbound ? "items-end" : "items-start",
        )}
      >
        <span
          className={cn(
            "px-1 text-[10px] font-semibold uppercase tracking-wide",
            isOutbound ? "text-[color:var(--primary)]" : "text-[color:var(--foreground-muted)]",
          )}
        >
          {isOutbound ? labels.fromMe : labels.fromCandidate}
        </span>
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
            isOutbound
              ? "rounded-br-md bg-[color:var(--primary)] text-[color:var(--primary-foreground)]"
              : "rounded-bl-md border border-[color:var(--line)] bg-[color:var(--surface)] text-[color:var(--foreground)]",
          )}
        >
          <p className="whitespace-pre-wrap break-words">{msg.text}</p>
          {msg.sentAt ? (
            <p
              className={cn(
                "text-[10px] mt-1.5 tabular-nums",
                isOutbound ? "text-[color:var(--primary-foreground)]/80 text-right" : "text-[color:var(--foreground-muted)]",
              )}
            >
              {formatMessageTime(msg.sentAt, locale)}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function CandidateLinxaChatDialog({
  open,
  onClose,
  candidateId,
  candidateName,
  profileUrl,
  messages: hh,
  locale,
}: CandidateLinxaChatDialogProps) {
  const d = hh.candidates.detail;
  const [loading, setLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState<LinxaChatMessage[]>([]);

  // State phục vụ Smart Inbox & AI Composer
  const [typedMessage, setTypedMessage] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    const res = await fetchCandidateLinxaChatMessages(candidateId);
    setLoading(false);
    if (!res.success) {
      setChatMessages([]);
      toast.error(res.error);
      return;
    }
    setChatMessages(refineLinxaMessageDirections(res.messages, candidateName));
  }, [candidateId, candidateName]);

  const handleAiSuggest = async () => {
    setAiGenerating(true);
    const res = await generateAIChatReply(candidateId);
    setAiGenerating(false);
    if (res.success && res.reply) {
      setTypedMessage(res.reply);
      toast.success(d.chatAiSuggestSuccess);
    } else {
      toast.error(res.error || d.chatAiSuggestError);
    }
  };

  const handleSendMessage = async () => {
    if (!typedMessage.trim()) return;
    if (!profileUrl) {
      toast.error(d.chatMissingProfileError);
      return;
    }
    setSendingMsg(true);
    const res = await sendLinkedInMessageCDP(profileUrl, typedMessage);
    setSendingMsg(false);
    if (res.success) {
      toast.success(d.chatSendSuccess);
      setTypedMessage("");
      // Nạp lại tin nhắn mới
      await loadMessages();
    } else {
      toast.error(res.error || d.chatSendError);
    }
  };

  const [syncingCDP, setSyncingCDP] = useState(false);

  const handleSyncLinkedInCDP = async () => {
    setSyncingCDP(true);
    const res = await syncLinkedInThreadCDP(candidateId);
    setSyncingCDP(false);
    if (res.success) {
      toast.success(`Đã đồng bộ ${res.savedMessages} tin nhắn mới`);
      await loadMessages();
    } else {
      toast.error(res.error || d.chatSyncError);
    }
  };

  useEffect(() => {
    if (!open) return;
    void loadMessages();
  }, [open, loadMessages]);

  if (!open) return null;

  const bubbleLabels = {
    fromMe: d.linxaChatFromMe,
    fromCandidate: d.linxaChatFromCandidate,
    unknownSender: d.linxaChatUnknownSender,
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/30 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="linxa-chat-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl max-h-[88vh] flex flex-col rounded-2xl bg-[color:var(--surface)] shadow-xl border border-[color:var(--line)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[color:var(--line)] px-5 py-4 shrink-0">
          <div className="min-w-0">
            <h2 id="linxa-chat-title" className="text-lg font-bold flex items-center gap-2 text-[color:var(--primary)]">
              <MessageSquare className="h-5 w-5 shrink-0" />
              {d.linxaChatTitle}
            </h2>
            <p className="text-xs text-[color:var(--foreground-muted)] mt-0.5 truncate">
              {candidateName}
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-[14rem] max-h-[min(48vh,480px)] px-3 py-4 bg-[color:var(--surface-soft)] border-b border-[color:var(--line)] vclaw-custom-scrollbar">
          <div className="grid grid-cols-2 gap-y-3 w-full">
          {loading ? (
            <div className="col-span-2 flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[color:var(--muted)]" />
              <span className="sr-only">{d.linxaChatLoading}</span>
            </div>
          ) : chatMessages.length === 0 ? (
            <p className="col-span-2 text-sm text-[color:var(--foreground-muted)] text-center py-10">
              {d.linxaChatEmpty}
            </p>
          ) : (
            chatMessages.map((msg) => (
              <LinxaChatBubble
                key={msg.id}
                msg={msg}
                labels={bubbleLabels}
                locale={locale}
              />
            ))
          )}
          </div>
        </div>

        {/* Smart Inbox - AI Chat Composer tối ưu hóa diện tích & hỗ trợ đa ngôn ngữ */}
        <div className="px-4 py-3 bg-[color:var(--surface)] shrink-0 flex flex-col gap-2">
          <textarea
            className="w-full min-h-[70px] max-h-[150px] rounded-lg border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-3 py-2 text-xs text-[color:var(--foreground)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--primary)] disabled:cursor-not-allowed disabled:opacity-50 resize-y vclaw-custom-scrollbar"
            placeholder={d.chatInputPlaceholder || "Nhập nội dung tin nhắn hoặc nhấn 'Soạn bằng AI'..."}
            value={typedMessage}
            onChange={(e) => setTypedMessage(e.target.value)}
            disabled={aiGenerating || sendingMsg}
          />
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs gap-1.5 border-purple-200 dark:border-purple-900 bg-purple-50/80 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-950/50 hover:text-purple-800 dark:hover:text-purple-300 transition-all duration-200"
              disabled={aiGenerating || loading}
              onClick={handleAiSuggest}
            >
              {aiGenerating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              )}
              {d.chatAiSuggestCta || "Soạn bằng AI"}
            </Button>
            
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="h-8 px-4 text-xs gap-1.5 transition-all duration-200"
              disabled={!typedMessage.trim() || sendingMsg || aiGenerating}
              onClick={handleSendMessage}
            >
              {sendingMsg ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              {d.chatSendCta || "Gửi tin nhắn"}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[color:var(--line)] px-5 py-4 shrink-0 bg-[color:var(--surface)]">
          <span className="text-xs text-[color:var(--foreground-muted)] tabular-nums">
            {chatMessages.length > 0
              ? d.linxaChatCount.replace("{count}", String(chatMessages.length))
              : ""}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-purple-200 dark:border-purple-900 bg-purple-50/80 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-950/50 hover:text-purple-800 dark:hover:text-purple-300"
              disabled={loading || syncingCDP}
              onClick={handleSyncLinkedInCDP}
            >
              {syncingCDP ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 mr-1.5 text-purple-600 dark:text-purple-400" />
              )}
              {d.chatSyncCta || "Đồng bộ tin nhắn"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => void loadMessages()}
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              )}
              {d.linxaChatReload}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
