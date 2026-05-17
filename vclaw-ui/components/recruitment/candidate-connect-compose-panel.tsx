"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Sparkles, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AdminHhContent } from "@/lib/admin/content";
import {
  sendCandidateLinkedInConnect,
  suggestCandidateConnectNote,
} from "@/lib/recruitment/linkedin-connect-actions";
import { isLinkedInProfileUrl } from "@/lib/recruitment/candidate-types";
import { toast } from "sonner";

const MAX_NOTE = 300;

type CandidateConnectComposePanelProps = {
  candidateId: string;
  candidateName: string;
  profileUrl?: string | null;
  messages: AdminHhContent;
  onSent?: () => void;
  onCancel?: () => void;
};

/** Form gửi lời mời kết nối + ghi chú (AI từ JD) — qua LinkedIn CDP. */
export function CandidateConnectComposePanel({
  candidateId,
  candidateName,
  profileUrl,
  messages,
  onSent,
  onCancel,
}: CandidateConnectComposePanelProps) {
  const c = messages.candidates.connectInvite;
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const canSend = isLinkedInProfileUrl(profileUrl);
  const remaining = MAX_NOTE - text.length;

  useEffect(() => {
    setText("");
  }, [candidateId]);

  const handleSuggest = async () => {
    setSuggesting(true);
    const res = await suggestCandidateConnectNote(candidateId);
    setSuggesting(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    setText(res.note);
    toast.success(c.suggestSuccess);
  };

  const handleSend = async () => {
    const body = text.trim();
    if (!body) {
      toast.error(c.emptyNote);
      return;
    }
    if (!canSend) {
      toast.error(c.missingProfile);
      return;
    }
    setSending(true);
    try {
      const res = await sendCandidateLinkedInConnect(candidateId, body);
      if (!res.success) {
        toast.error(res.error ?? c.sendError);
        return;
      }
      toast.success(res.note ?? c.sendSuccess.replace("{name}", candidateName));
      onSent?.();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-2.5 space-y-2">
      <p className="text-xs font-semibold text-[color:var(--foreground-strong)]">{c.title}</p>
      {!canSend && (
        <p className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-md px-2 py-1">
          {c.missingProfile}
        </p>
      )}
      <textarea
        className="w-full min-h-[88px] max-h-36 rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] px-2.5 py-2 text-sm resize-y"
        placeholder={c.notePlaceholder}
        value={text}
        maxLength={MAX_NOTE}
        onChange={(e) => setText(e.target.value)}
        disabled={sending}
      />
      <p
        className={`text-[10px] text-right ${remaining < 30 ? "text-amber-700" : "text-[color:var(--foreground-muted)]"}`}
      >
        {remaining} / {MAX_NOTE}
      </p>
      <div className="flex gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1 min-w-0 h-8 px-2 text-[11px]"
          disabled={suggesting || sending}
          onClick={() => void handleSuggest()}
        >
          {suggesting ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 shrink-0 mr-1" />
          )}
          <span className="truncate">{c.suggestJdNote}</span>
        </Button>
        {onCancel ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2.5 text-xs shrink-0"
            onClick={onCancel}
            disabled={sending}
          >
            {c.cancel}
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          className="flex-1 min-w-0 h-8 px-2 text-[11px] bg-[color:var(--brand-strong)] text-white hover:opacity-90"
          disabled={sending || !canSend}
          onClick={() => void handleSend()}
        >
          {sending ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
          ) : (
            <UserPlus className="h-3.5 w-3.5 shrink-0 mr-1" />
          )}
          <span className="truncate">{sending ? c.sending : c.confirmSend}</span>
        </Button>
      </div>
    </div>
  );
}
