"use client";

import { useState } from "react";
import {
  History,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type AutomationJobRow = {
  id: string;
  type: string;
  title?: string | null;
  channel?: string | null;
  target?: string | null;
  status: string;
  result?: string | null;
  notes?: string | null;
  draftContent?: string | null;
  approvalStatus?: string | null;
  createdAt: string;
};

const TYPE_LABELS: Record<string, string> = {
  FOLLOWUP_PAYMENT: "Nhắc thanh toán",
  REENGAGE_LEAD: "Tái kích hoạt Lead",
  BOOKING_REMINDER: "Nhắc lịch hẹn",
  MARKETING: "Chiến dịch",
  OUTBOUND: "Gửi tin",
};

function JobRow({ job }: { job: AutomationJobRow }) {
  const [expanded, setExpanded] = useState(false);
  const isDone = job.status === "DONE";
  const isFailed = job.status === "FAILED";

  return (
    <div className="border-b border-[color:var(--line)] last:border-0">
      <button
        type="button"
        className="w-full text-left p-4 hover:bg-[color:var(--surface-softer)] transition-colors flex items-start gap-3"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Status icon */}
        <div className="flex-shrink-0 mt-0.5">
          {isDone ? (
            <div className="bg-green-100 dark:bg-green-900/30 p-1.5 rounded-full">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          ) : isFailed ? (
            <div className="bg-red-100 dark:bg-red-900/30 p-1.5 rounded-full">
              <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
          ) : (
            <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full">
              <Clock className="h-4 w-4 text-slate-500" />
            </div>
          )}
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-[color:var(--foreground-strong)] truncate">
              {job.title || TYPE_LABELS[job.type] || job.type}
            </span>
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 font-normal shrink-0 ${
                isDone
                  ? "border-green-300 text-green-700"
                  : isFailed
                  ? "border-red-300 text-red-700"
                  : ""
              }`}
            >
              {isDone ? "Thành công" : isFailed ? "Thất bại" : job.status}
            </Badge>
          </div>

          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {job.target && (
              <span className="flex items-center gap-1 text-xs text-[color:var(--muted)]">
                <User className="h-3 w-3 shrink-0" />
                {job.target}
              </span>
            )}
            {job.channel && (
              <span className="text-xs text-[color:var(--muted)]">{job.channel}</span>
            )}
            <span className="text-[10px] text-[color:var(--muted)]">
              {new Date(job.createdAt).toLocaleString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "2-digit",
              })}
            </span>
          </div>

          {job.result && (
            <div className={`text-xs mt-1 ${isFailed ? "text-red-600" : "text-[color:var(--muted)]"}`}>
              {job.result}
            </div>
          )}
        </div>

        {/* Expand toggle */}
        {job.draftContent && (
          <div className="flex-shrink-0 text-[color:var(--muted)] mt-0.5">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        )}
      </button>

      {/* Expanded: nội dung tin nhắn đã gửi */}
      {expanded && job.draftContent && (
        <div className="px-4 pb-4 pl-11">
          <div className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface-soft)] overflow-hidden">
            <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-[color:var(--line)] bg-[color:var(--surface-softer)]">
              <MessageSquare className="h-3 w-3 text-[color:var(--muted)]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--muted)]">
                Nội dung đã gửi
              </span>
            </div>
            <pre className="px-3 py-2.5 text-xs text-[color:var(--foreground)] whitespace-pre-wrap font-sans leading-relaxed">
              {job.draftContent}
            </pre>
          </div>
          {job.notes && (
            <p className="text-[10px] text-[color:var(--muted)] mt-1.5 italic">{job.notes}</p>
          )}
        </div>
      )}
    </div>
  );
}

export function AutomationJobManager({
  jobs = [],
}: {
  jobs: AutomationJobRow[];
}) {
  const doneCount = jobs.filter((j) => j.status === "DONE").length;
  const failedCount = jobs.filter((j) => j.status === "FAILED").length;

  return (
    <Card className="border-[color:var(--line)] bg-[color:var(--surface-strong)] shadow-sm overflow-hidden">
      <CardHeader className="border-b border-[color:var(--line)] bg-[color:var(--surface-soft)]">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4 text-[color:var(--brand)]" />
              Lịch sử gửi tin tự động
            </CardTitle>
            <CardDescription>Nhấn vào từng dòng để xem nội dung đã gửi.</CardDescription>
          </div>
          <div className="flex gap-2 shrink-0">
            {doneCount > 0 && (
              <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">
                {doneCount} thành công
              </Badge>
            )}
            {failedCount > 0 && (
              <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]">
                {failedCount} thất bại
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div>
          {jobs.map((job) => (
            <JobRow key={job.id} job={job} />
          ))}

          {jobs.length === 0 && (
            <div className="py-12 flex flex-col items-center justify-center text-[color:var(--muted)] opacity-50 italic text-sm">
              <History className="h-10 w-10 mb-2 opacity-20" />
              Chưa có lịch sử gửi tin.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
