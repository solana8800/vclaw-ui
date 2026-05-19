"use client";

import React, { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/shared";
import type { AdminHhContent } from "@/lib/admin/content";
import { resolveLinkedInProfileBadgeStatus } from "@/lib/recruitment/candidate-jd-eligibility";
import { isLinkedInProfileUrl } from "@/lib/recruitment/candidate-types";
import { toast } from "sonner";

const LinkedInIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

type BulkCandidateRow = {
  id: string;
  name: string;
  profileUrl?: string | null;
  linkedinProfileIdUrl?: string | null;
  extractedInfo?: string | null;
};

type CandidateBulkLinkedInProfileDialogProps = {
  open: boolean;
  onClose: () => void;
  candidates: BulkCandidateRow[];
  messages: AdminHhContent;
  onStartBackground: (params: { candidateIds: string[]; namesById: Record<string, string> }) => void;
};

export function CandidateBulkLinkedInProfileDialog({
  open,
  onClose,
  candidates,
  messages,
  onStartBackground,
}: CandidateBulkLinkedInProfileDialogProps) {
  const b = messages.candidates.bulkLinkedIn;
  const needsScrape = useMemo(
    () =>
      candidates.filter((c) => {
        const liUrl = isLinkedInProfileUrl(c.profileUrl)
          ? c.profileUrl
          : c.linkedinProfileIdUrl;
        if (!isLinkedInProfileUrl(liUrl)) return false;
        return resolveLinkedInProfileBadgeStatus(liUrl, c.extractedInfo) !== "scraped";
      }),
    [candidates],
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (open) {
      setSelected(new Set(needsScrape.map((c) => c.id)));
    }
  }, [open, needsScrape]);

  if (!open) return null;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === needsScrape.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(needsScrape.map((c) => c.id)));
    }
  };

  const handleRun = () => {
    const ids = [...selected];
    if (ids.length === 0) {
      toast.info(b.selectAtLeastOne);
      return;
    }
    const namesById: Record<string, string> = {};
    for (const row of needsScrape) {
      if (ids.includes(row.id)) namesById[row.id] = row.name;
    }
    onStartBackground({ candidateIds: ids, namesById });
    toast.info(messages.candidates.backgroundTasks.bulkLinkedInQueued.replace("{count}", String(ids.length)));
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl bg-[color:var(--surface)] shadow-xl border border-[color:var(--line)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[color:var(--line)] px-5 py-4">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <LinkedInIcon className="h-5 w-5 text-[#0a66c2]" />
              {b.title}
            </h2>
            {b.hint?.trim() ? (
              <p className="text-xs text-[color:var(--foreground-muted)] mt-1">{b.hint}</p>
            ) : null}
          </div>
          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {needsScrape.length === 0 ? (
            <p className="text-sm text-[color:var(--foreground-muted)] py-6 text-center">{b.empty}</p>
          ) : (
            <>
              <button
                type="button"
                className="text-xs text-[color:var(--brand-strong)] font-medium mb-2"
                onClick={toggleAll}
              >
                {selected.size === needsScrape.length ? b.deselectAll : b.selectAll}
              </button>
              <ul className="space-y-1.5">
                {needsScrape.map((row) => (
                  <label
                    key={row.id}
                    className={cn(
                      "flex gap-2 rounded-lg border px-3 py-2 cursor-pointer text-sm",
                      selected.has(row.id)
                        ? "border-[color:var(--brand)] bg-[color:var(--brand-soft)]/30"
                        : "border-[color:var(--line)]",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={selected.has(row.id)}
                      onChange={() => toggle(row.id)}
                    />
                    <span className="font-medium truncate">{row.name}</span>
                  </label>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-[color:var(--line)] px-5 py-4">
          <span className="text-xs text-[color:var(--foreground-muted)]">
            {b.selectedCount.replace("{count}", String(selected.size))}
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {b.cancel}
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={needsScrape.length === 0 || selected.size === 0}
              onClick={handleRun}
            >
              <LinkedInIcon className="h-4 w-4 mr-2" />
              {b.runBackground}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
