"use client";

import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import type { RecruitmentBgTask } from "@/components/recruitment/use-recruitment-background-tasks";
import { cn } from "@/lib/shared";

type RecruitmentBackgroundTasksBannerProps = {
  tasks: RecruitmentBgTask[];
};

export function RecruitmentBackgroundTasksBanner({ tasks }: RecruitmentBackgroundTasksBannerProps) {
  if (tasks.length === 0) return null;

  return (
    <div className="space-y-2" aria-live="polite" aria-label="Tác vụ nền đang chạy">
      {tasks.map((task) => (
        <BackgroundTaskRow key={task.id} task={task} />
      ))}
    </div>
  );
}

function BackgroundTaskRow({ task }: { task: RecruitmentBgTask }) {
  const pct = task.total > 0 ? Math.round((task.done / task.total) * 100) : 0;
  const isRunning = task.status === "running";

  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2.5 text-sm",
        task.status === "error"
          ? "border-red-200 bg-red-50/90 text-red-900"
          : task.status === "success"
            ? "border-emerald-200 bg-emerald-50/80 text-emerald-900"
            : "border-[color:var(--brand)]/30 bg-[color:var(--brand-soft)]/40 text-[color:var(--brand-strong)]",
      )}
    >
      <div className="flex items-start gap-2">
        {isRunning ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin mt-0.5" />
        ) : task.status === "success" ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
        ) : (
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-medium leading-snug">{task.label}</p>
          {task.detail ? (
            <p className="text-xs opacity-80 truncate">{task.detail}</p>
          ) : null}
          {isRunning && task.total > 0 ? (
            <div className="flex items-center gap-2 pt-0.5">
              <div className="h-1.5 flex-1 rounded-full bg-black/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[color:var(--brand-strong)] transition-all duration-300"
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
              <span className="text-[11px] tabular-nums shrink-0">
                {task.done}/{task.total}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
