"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Briefcase, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/shared";
import type { AdminHhContent } from "@/lib/admin/content";
import { batchAssignCandidatesToJob } from "@/lib/actions/recruitment/actions";
import { toast } from "@/lib/notifications/toast";

type BulkAssignCandidateRow = {
  id: string;
  name: string;
  jobPositionId?: string | null;
  jobPosition?: { id: string; title: string } | null;
};

type JobOption = { id: string; title: string };

type CandidateBulkAssignJobDialogProps = {
  open: boolean;
  onClose: () => void;
  jobs: JobOption[];
  candidates: BulkAssignCandidateRow[];
  initialSelectedIds?: string[];
  messages: AdminHhContent;
  onDone?: () => void;
};

const SELECT_CLASS =
  "flex h-9 w-full items-center rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50";

function hasAssignedJob(row: BulkAssignCandidateRow): boolean {
  return Boolean(row.jobPositionId?.trim());
}

/** Ưu tiên checkbox từ bảng; không có thì chọn mặc định ứng viên chưa gắn vị trí. */
export function defaultSelectedCandidateIds(
  candidates: BulkAssignCandidateRow[],
  initialSelectedIds?: string[],
): string[] {
  const inDialog = new Set(candidates.map((c) => c.id));
  if (initialSelectedIds?.length) {
    return initialSelectedIds.filter((id) => inDialog.has(id));
  }
  return candidates.filter((c) => !hasAssignedJob(c)).map((c) => c.id);
}

export function CandidateBulkAssignJobDialog({
  open,
  onClose,
  jobs,
  candidates,
  initialSelectedIds,
  messages,
  onDone,
}: CandidateBulkAssignJobDialogProps) {
  const b = messages.candidates.bulkAssignJob;
  const [pickJobId, setPickJobId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assigning, setAssigning] = useState(false);

  const unassignedCandidates = useMemo(
    () => candidates.filter((c) => !hasAssignedJob(c)),
    [candidates],
  );

  useEffect(() => {
    if (!open) return;
    setPickJobId(jobs[0]?.id ?? "");
    setSelected(new Set(defaultSelectedCandidateIds(candidates, initialSelectedIds)));
  }, [open, candidates, initialSelectedIds, jobs]);

  const jobTitle = useMemo(
    () => jobs.find((j) => j.id === pickJobId)?.title ?? "",
    [jobs, pickJobId],
  );

  if (!open) return null;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllUnassigned = () => {
    const unassignedIds = unassignedCandidates.map((c) => c.id);
    const allUnassignedSelected =
      unassignedIds.length > 0 && unassignedIds.every((id) => selected.has(id));
    if (allUnassignedSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(unassignedIds));
    }
  };

  const toggleAll = () => {
    if (selected.size === candidates.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(candidates.map((c) => c.id)));
    }
  };

  const handleAssign = async () => {
    if (!pickJobId) {
      toast.info(b.pickJob);
      return;
    }
    const ids = [...selected];
    if (ids.length === 0) {
      toast.info(b.selectAtLeastOne);
      return;
    }
    setAssigning(true);
    const res = await batchAssignCandidatesToJob(ids, pickJobId);
    setAssigning(false);
    if (res.success) {
      toast.success(
        b.doneSuccess
          .replace("{count}", String(res.assigned))
          .replace("{title}", res.jobTitle ?? jobTitle),
      );
      onDone?.();
      onClose();
    } else {
      toast.error(res.errors[0] ?? b.doneFailed);
    }
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
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-[color:var(--brand-strong)]" />
            {b.title}
          </h2>
          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="px-5 py-3 border-b border-[color:var(--line)] space-y-1.5">
          <label className="text-xs font-medium text-[color:var(--foreground-muted)]">{b.jobLabel}</label>
          <select
            className={SELECT_CLASS}
            value={pickJobId}
            onChange={(e) => setPickJobId(e.target.value)}
            disabled={assigning || jobs.length === 0}
          >
            {jobs.length === 0 ? (
              <option value="">{b.noJobs}</option>
            ) : (
              jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {candidates.length === 0 ? (
            <p className="text-sm text-[color:var(--foreground-muted)] py-6 text-center">{b.empty}</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2 text-xs">
                <button
                  type="button"
                  className="text-[color:var(--brand-strong)] font-medium"
                  onClick={toggleAllUnassigned}
                  disabled={assigning || unassignedCandidates.length === 0}
                >
                  {unassignedCandidates.length > 0 &&
                  unassignedCandidates.every((c) => selected.has(c.id))
                    ? b.deselectUnassigned
                    : b.selectUnassigned}
                </button>
                <span className="text-[color:var(--foreground-muted)]">·</span>
                <button
                  type="button"
                  className="text-[color:var(--brand-strong)] font-medium"
                  onClick={toggleAll}
                  disabled={assigning}
                >
                  {selected.size === candidates.length ? b.deselectAll : b.selectAll}
                </button>
              </div>
              <ul className="space-y-1.5">
                {candidates.map((row) => {
                  const assigned = hasAssignedJob(row);
                  return (
                    <label
                      key={row.id}
                      className={cn(
                        "flex gap-2 rounded-lg border px-3 py-2 cursor-pointer text-sm",
                        selected.has(row.id)
                          ? "border-[color:var(--brand)] bg-[color:var(--brand-soft)]/30"
                          : assigned
                            ? "border-[color:var(--line)] bg-[color:var(--surface-soft)]/60"
                            : "border-[color:var(--line)]",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 shrink-0"
                        checked={selected.has(row.id)}
                        disabled={assigning}
                        onChange={() => toggle(row.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="font-medium truncate block">{row.name}</span>
                        <span
                          className={cn(
                            "text-[11px] truncate block",
                            assigned
                              ? "text-[color:var(--foreground)]"
                              : "text-[color:var(--foreground-muted)]",
                          )}
                        >
                          {assigned && row.jobPosition?.title
                            ? b.currentJob.replace("{title}", row.jobPosition.title)
                            : b.noJobYet}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-[color:var(--line)] px-5 py-4">
          <span className="text-xs text-[color:var(--foreground-muted)]">
            {b.selectedCount.replace("{count}", String(selected.size))}
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={assigning}>
              {b.cancel}
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={assigning || jobs.length === 0 || candidates.length === 0 || selected.size === 0}
              onClick={() => void handleAssign()}
            >
              {assigning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {b.run}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
