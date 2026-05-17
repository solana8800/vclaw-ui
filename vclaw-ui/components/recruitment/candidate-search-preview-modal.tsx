"use client";

import React, { useMemo, useState } from "react";
import { ExternalLink, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/shared";
import type { LinkedInSearchHit } from "@/lib/recruitment/candidate-types";
import type { AdminHhContent } from "@/lib/admin/content";

type CandidateSearchPreviewModalProps = {
  open: boolean;
  onClose: () => void;
  query: string;
  results: LinkedInSearchHit[];
  messages: AdminHhContent;
  saving: boolean;
  onSave: (selected: LinkedInSearchHit[]) => void;
  onSaveAndEvaluate?: (selected: LinkedInSearchHit[]) => void;
};

export function CandidateSearchPreviewModal({
  open,
  onClose,
  query,
  results,
  messages,
  saving,
  onSave,
  onSaveAndEvaluate,
}: CandidateSearchPreviewModalProps) {
  const p = messages.candidates.preview;
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allUrls = useMemo(() => results.map((r) => r.profile_url), [results]);

  React.useEffect(() => {
    if (open) {
      setSelected(new Set(allUrls));
    }
  }, [open, allUrls]);

  if (!open) return null;

  const toggle = (url: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === results.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allUrls));
    }
  };

  const selectedRows = results.filter((r) => selected.has(r.profile_url));

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-[color:var(--surface)] shadow-xl border border-[color:var(--line)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[color:var(--line)] px-5 py-4">
          <div>
            <h2 className="text-lg font-bold">{p.title}</h2>
            <p className="text-xs text-[color:var(--foreground-muted)] mt-1">
              {p.queryLabel}: <span className="font-medium text-[color:var(--foreground)]">{query}</span>
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          {results.length === 0 ? (
            <p className="text-sm text-[color:var(--foreground-muted)] py-8 text-center">{p.empty}</p>
          ) : (
            <>
              <button
                type="button"
                className="text-xs text-[color:var(--brand-strong)] font-medium mb-2"
                onClick={toggleAll}
              >
                {selected.size === results.length ? p.deselectAll : p.selectAll}
              </button>
              {results.map((row) => (
                <label
                  key={row.profile_url}
                  className={cn(
                    "flex gap-3 rounded-xl border p-3 cursor-pointer transition-colors",
                    selected.has(row.profile_url)
                      ? "border-[color:var(--brand)] bg-[color:var(--brand-soft)]/40"
                      : "border-[color:var(--line)] hover:bg-[color:var(--surface-soft)]",
                  )}
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={selected.has(row.profile_url)}
                    onChange={() => toggle(row.profile_url)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-sm">{row.name}</span>
                      {row.matchScore != null && (
                        <span
                          className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full shrink-0"
                          title={p.preliminaryScore}
                        >
                          {p.preliminaryScore} {row.matchScore}%
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[color:var(--foreground-muted)] line-clamp-2 mt-0.5">
                      {row.headline || "—"}
                      {row.location ? ` · ${row.location}` : ""}
                    </p>
                    {row.matchSummary && (
                      <p className="text-xs text-[color:var(--foreground-muted)] mt-1 line-clamp-2">
                        {row.matchSummary}
                      </p>
                    )}
                  </div>
                  <a
                    href={row.profile_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 p-1 text-[#0A66C2]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </label>
              ))}
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[color:var(--line)] px-5 py-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            {p.cancel}
          </Button>
          {onSaveAndEvaluate ? (
            <Button
              type="button"
              variant="secondary"
              disabled={saving || selectedRows.length === 0}
              onClick={() => onSaveAndEvaluate(selectedRows)}
            >
              {p.saveAndEvaluateAi}
            </Button>
          ) : null}
          <Button
            type="button"
            disabled={saving || selectedRows.length === 0}
            onClick={() => onSave(selectedRows)}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {p.saving}
              </>
            ) : (
              p.saveSelected.replace("{count}", String(selectedRows.length))
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
