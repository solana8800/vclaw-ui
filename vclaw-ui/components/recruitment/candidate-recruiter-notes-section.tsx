"use client";

import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AdminHhContent } from "@/lib/admin/content";
import { updateCandidateHrInfo } from "@/lib/actions/recruitment/actions";
import { toast } from "@/lib/notifications/toast";

type CandidateRecruiterNotesSectionProps = {
  candidateId: string;
  initialNotes: string;
  initialEmail: string;
  initialPhone: string;
  messages: AdminHhContent;
  onSaved?: () => void;
};

export function CandidateRecruiterNotesSection({
  candidateId,
  initialNotes,
  initialEmail,
  initialPhone,
  messages,
  onSaved,
}: CandidateRecruiterNotesSectionProps) {
  const d = messages.candidates.detail;
  const [notes, setNotes] = useState(initialNotes);
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [savedBaseline, setSavedBaseline] = useState({
    notes: initialNotes,
    email: initialEmail,
    phone: initialPhone,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNotes(initialNotes);
    setEmail(initialEmail);
    setPhone(initialPhone);
    setSavedBaseline({
      notes: initialNotes,
      email: initialEmail,
      phone: initialPhone,
    });
  }, [candidateId, initialNotes, initialEmail, initialPhone]);

  const handleSave = async () => {
    setSaving(true);
    const res = await updateCandidateHrInfo(candidateId, { notes, email, phone });
    setSaving(false);
    if (res.success) {
      setSavedBaseline({ notes, email, phone });
      toast.success(d.recruiterNotesSaved);
      onSaved?.();
    } else {
      toast.error(res.error ?? d.recruiterNotesError);
    }
  };

  const dirty =
    notes !== savedBaseline.notes ||
    email !== savedBaseline.email ||
    phone !== savedBaseline.phone;
  const hint = d.recruiterNotesHint?.trim();

  const fieldClass =
    "w-full rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-sm";

  return (
    <section className="space-y-2" aria-labelledby="candidate-recruiter-notes-heading">
      <h3
        id="candidate-recruiter-notes-heading"
        className="text-xs font-semibold uppercase tracking-wide text-[color:var(--foreground-muted)]"
      >
        {d.recruiterNotesTitle}
      </h3>
      {hint ? (
        <p className="text-[11px] text-[color:var(--foreground-muted)] leading-relaxed">{hint}</p>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="space-y-1">
          <label
            htmlFor="candidate-contact-email"
            className="text-[11px] font-medium text-[color:var(--foreground-muted)]"
          >
            {d.contactEmailLabel}
          </label>
          <input
            id="candidate-contact-email"
            type="email"
            autoComplete="email"
            className={fieldClass}
            placeholder={d.contactEmailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={saving}
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor="candidate-contact-phone"
            className="text-[11px] font-medium text-[color:var(--foreground-muted)]"
          >
            {d.contactPhoneLabel}
          </label>
          <input
            id="candidate-contact-phone"
            type="tel"
            autoComplete="tel"
            className={fieldClass}
            placeholder={d.contactPhonePlaceholder}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={saving}
          />
        </div>
      </div>

      <textarea
        className="w-full min-h-[120px] max-h-56 rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-sm resize-y font-mono leading-relaxed"
        placeholder={d.recruiterNotesPlaceholder}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        disabled={saving}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="text-xs"
        disabled={saving || !dirty}
        onClick={() => void handleSave()}
      >
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
        {d.recruiterNotesSave}
      </Button>
    </section>
  );
}
