"use client";

import React, { useMemo, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/shared";
import type { AdminHhContent } from "@/lib/admin/content";
import { hasJdEvaluation } from "@/lib/recruitment/candidate-status";
import { toast } from "sonner";

type BulkCandidateRow = {
  id: string;
  name: string;
  aiAnalysisSummary?: string | null;
  jobPositionId?: string | null;
};

type CandidateBulkAiEvaluateDialogProps = {
  open: boolean;
  onClose: () => void;
  jobPositionId: string;
  jobTitle: string;
  candidates: BulkCandidateRow[];
  messages: AdminHhContent;
  onStartBackground: (params: {
    candidateIds: string[];
    namesById: Record<string, string>;
    jobPositionId: string;
    jobTitle: string;
  }) => void;
};

export function CandidateBulkAiEvaluateDialog({
  open,
  onClose,
  jobPositionId,
  jobTitle,
  candidates,
  messages,
  onStartBackground,
}: CandidateBulkAiEvaluateDialogProps) {
  const b = messages.candidates.bulkAi;
  const unscored = useMemo(
    () => candidates.filter((c) => !hasJdEvaluation(c.aiAnalysisSummary)),
    [candidates],
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (open) {
      setSelected(new Set(unscored.map((c) => c.id)));
    }
  }, [open, unscored]);

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
    if (selected.size === unscored.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(unscored.map((c) => c.id)));
    }
  };

  const handleRun = () => {
    const ids = [...selected];
    if (ids.length === 0) {
      toast.info(b.selectAtLeastOne);
      return;
    }
    const namesById: Record<string, string> = {};
    for (const row of unscored) {
      if (ids.includes(row.id)) namesById[row.id] = row.name;
    }
    onStartBackground({ candidateIds: ids, namesById, jobPositionId, jobTitle });
    toast.info(
      messages.candidates.backgroundTasks.bulkAiQueued.replace("{count}", String(ids.length)),
    );
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
              <Sparkles className="h-5 w-5 text-[color:var(--brand-strong)]" />
              {b.title}
            </h2>
            <p className="text-xs text-[color:var(--foreground-muted)] mt-1">
              {b.jobLabel}: <span className="font-medium">{jobTitle}</span>
            </p>
            {b.runBackgroundHint?.trim() ? (
              <p className="text-[11px] text-[color:var(--foreground-muted)] mt-1.5">{b.runBackgroundHint}</p>
            ) : null}
          </div>
          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {unscored.length === 0 ? (
            <p className="text-sm text-[color:var(--foreground-muted)] py-6 text-center">{b.empty}</p>
          ) : (
            <>
              {b.hint?.trim() ? (
                <p className="text-xs text-[color:var(--foreground-muted)] mb-3">{b.hint}</p>
              ) : null}
              <button
                type="button"
                className="text-xs text-[color:var(--brand-strong)] font-medium mb-2"
                onClick={toggleAll}
              >
                {selected.size === unscored.length ? b.deselectAll : b.selectAll}
              </button>
              <ul className="space-y-1.5">
                {unscored.map((row) => (
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
              disabled={unscored.length === 0 || selected.size === 0}
              onClick={handleRun}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {b.runBackground}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
