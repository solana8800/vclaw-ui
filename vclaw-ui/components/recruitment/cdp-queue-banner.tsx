"use client";

import { Loader2, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/shared";
import { useCdpQueue } from "@/components/recruitment/use-cdp-queue";
import type { CdpTaskEntry } from "@/lib/recruitment/cdp-queue";

export function CdpQueueBanner() {
  const { entries, queued } = useCdpQueue();

  // Chỉ hiện khi có task đang chạy, chờ, hoặc vừa lỗi
  const visible = entries.filter((e) => e.status !== "done");
  if (visible.length === 0) return null;

  const running = visible.find((e) => e.status === "running");
  const errors = visible.filter(
    (e) => e.status === "error" || e.status === "timeout",
  );

  return (
    <div className="space-y-1.5" aria-live="polite" aria-label="Hàng đợi CDP">
      {running && (
        <CdpTaskRow entry={running} queuedCount={queued.length} />
      )}
      {!running && queued.length > 0 && (
        <CdpTaskRow entry={queued[0]!} queuedCount={queued.length - 1} waiting />
      )}
      {errors.map((e) => (
        <CdpTaskRow key={e.id} entry={e} queuedCount={0} />
      ))}
    </div>
  );
}

function CdpTaskRow({
  entry,
  queuedCount,
  waiting = false,
}: {
  entry: CdpTaskEntry;
  queuedCount: number;
  waiting?: boolean;
}) {
  const isRunning = entry.status === "running";
  const isError = entry.status === "error" || entry.status === "timeout";

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs",
        isError
          ? "border-red-200 bg-red-50/90 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
          : waiting
            ? "border-[color:var(--line)] bg-[color:var(--surface-soft)] text-[color:var(--foreground-muted)]"
            : "border-purple-200/70 bg-purple-50/80 text-purple-900 dark:border-purple-900/40 dark:bg-purple-950/30 dark:text-purple-200",
      )}
    >
      <span className="shrink-0">
        {isRunning ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-600 dark:text-purple-400" />
        ) : waiting ? (
          <Clock className="h-3.5 w-3.5" />
        ) : isError ? (
          <AlertCircle className="h-3.5 w-3.5 text-red-500" />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        )}
      </span>

      <span className="flex-1 truncate font-medium">
        {isError ? (entry.error ?? "Lỗi tác vụ CDP") : entry.label}
      </span>

      {queuedCount > 0 && (
        <span className="shrink-0 rounded-full bg-purple-100 dark:bg-purple-900/40 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700 dark:text-purple-300">
          +{queuedCount} chờ
        </span>
      )}
    </div>
  );
}
