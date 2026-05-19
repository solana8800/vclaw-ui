"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AdminHhContent } from "@/lib/admin/content";
import {
  sendCandidateLinkedInMessage,
  suggestCandidateOutreachMessage,
} from "@/lib/recruitment/linkedin-outreach-actions";
import { isLinkedInProfileUrl } from "@/lib/recruitment/candidate-types";
import { toast } from "@/lib/notifications/toast";

type CandidateOutreachComposePanelProps = {
  candidateId: string;
  candidateName: string;
  profileUrl?: string | null;
  messages: AdminHhContent;
  onSent?: () => void;
  onCancel?: () => void;
};

/** Form soạn tin nhúng trong panel chi tiết. */
export function CandidateOutreachComposePanel({
  candidateId,
  candidateName,
  profileUrl,
  messages,
  onSent,
  onCancel,
}: CandidateOutreachComposePanelProps) {
  const o = messages.candidates.outreach;
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const canSend = isLinkedInProfileUrl(profileUrl);

  useEffect(() => {
    setText("");
  }, [candidateId]);

  const handleSuggest = async () => {
    setSuggesting(true);
    const res = await suggestCandidateOutreachMessage(candidateId);
    setSuggesting(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    setText(res.message);
    toast.success(o.suggestSuccess);
  };

  const handleSend = async () => {
    const body = text.trim();
    if (!body) {
      toast.error(o.emptyMessage);
      return;
    }
    if (!canSend) {
      toast.error(o.missingProfile);
      return;
    }
    setSending(true);
    try {
      const res = await sendCandidateLinkedInMessage(candidateId, body);
      if (!res.success) {
        toast.error(res.error ?? o.sendError);
        return;
      }
      toast.success(res.note ?? o.sendSuccess.replace("{name}", candidateName));
      onSent?.();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-2.5 space-y-2">
      <p className="text-xs font-semibold text-[color:var(--foreground-strong)]">{o.title}</p>
      {!canSend && (
        <p className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-md px-2 py-1">
          {o.missingProfile}
        </p>
      )}
      <textarea
        className="w-full min-h-[88px] max-h-40 rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] px-2.5 py-2 text-sm resize-y"
        placeholder={o.messagePlaceholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={sending}
      />
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
          <span className="truncate">{o.suggestJdDraft}</span>
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
            {o.cancel}
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
            <span className="truncate">{o.confirmSend}</span>
          )}
        </Button>
      </div>
    </div>
  );
}
