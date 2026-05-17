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
import { toast } from "sonner";

type CandidateOutreachComposePanelProps = {
  candidateId: string;
  candidateName: string;
  profileUrl?: string | null;
  messages: AdminHhContent;
  onSent?: () => void;
  onCancel?: () => void;
};

/** Form soạn tin nhúng trong panel chi tiết — không overlay/blur. */
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
    <div className="rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-3 space-y-3">
      <p className="text-sm font-semibold text-[color:var(--foreground-strong)]">{o.title}</p>
      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
        {o.hitlWarning}
      </p>
      {!canSend && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
          {o.missingProfile}
        </p>
      )}
      <textarea
        className="w-full min-h-[160px] rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-sm resize-y"
        placeholder={o.messagePlaceholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={sending}
      />
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          disabled={suggesting || sending}
          onClick={() => void handleSuggest()}
        >
          {suggesting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          {o.suggestJdDraft}
        </Button>
        <div className="flex gap-2">
          {onCancel ? (
            <Button type="button" variant="ghost" className="flex-1" onClick={onCancel} disabled={sending}>
              {o.cancel}
            </Button>
          ) : null}
          <Button
            type="button"
            className="flex-1 bg-[color:var(--brand-strong)] text-white hover:opacity-90"
            disabled={sending || !canSend}
            onClick={() => void handleSend()}
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {o.sending}
              </>
            ) : (
              o.confirmSend
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
