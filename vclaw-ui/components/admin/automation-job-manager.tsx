"use client";

import {
  History,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type AutomationJobRow = {
  id: string;
  type: string;
  title?: string | null;
  channel?: string | null;
  status: string;
  target: string;
  approvalStatus?: string | null;
  result?: string | null;
  createdAt: string;
};

const TYPE_LABELS: Record<string, string> = {
  FOLLOWUP_PAYMENT: "Nhắc thanh toán",
  REENGAGE_LEAD: "Tái kích hoạt Lead",
  BOOKING_REMINDER: "Nhắc lịch hẹn",
  MARKETING: "Chiến dịch",
};

export function AutomationJobManager({
  jobs = []
}: {
  jobs: AutomationJobRow[]
}) {
  return (
    <Card className="border-[color:var(--line)] bg-[color:var(--surface-strong)] shadow-sm overflow-hidden">
      <CardHeader className="border-b border-[color:var(--line)] bg-[color:var(--surface-soft)]">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5 text-[color:var(--brand)]" />
              Lịch sử Tự động hóa
            </CardTitle>
            <CardDescription>Các tác vụ đã hoàn tất hoặc thất bại.</CardDescription>
          </div>
          <Badge variant="outline" className="text-[color:var(--muted)] border-[color:var(--line)]">
            {jobs.length} tác vụ
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-[color:var(--line)]">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="p-4 hover:bg-[color:var(--surface-softer)] transition-colors flex items-center gap-4"
            >
              <div className="flex-shrink-0">
                {job.status === "DONE" ? (
                  <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                ) : job.status === "FAILED" ? (
                  <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full">
                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                ) : (
                  <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full">
                    <Clock className="h-5 w-5 text-slate-500" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-[color:var(--foreground-strong)] truncate">
                    {job.title || TYPE_LABELS[job.type] || job.type}
                  </span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal shrink-0">
                    {TYPE_LABELS[job.type] || job.type}
                  </Badge>
                </div>
                <div className="text-xs text-[color:var(--muted)] flex items-center gap-1.5 mt-1 flex-wrap">
                  {job.channel && <span className="font-medium">{job.channel}</span>}
                  {job.channel && <span>·</span>}
                  <MessageSquare className="h-3 w-3 shrink-0" />
                  <span className="truncate">{job.target}</span>
                </div>
              </div>

              <div className="text-right hidden sm:block shrink-0">
                <div className="text-xs font-medium text-[color:var(--foreground-strong)]">
                  {job.result || (job.status === "DONE" ? "Đã hoàn tất" : "Thất bại")}
                </div>
                <div className="text-[10px] text-[color:var(--muted)] mt-0.5">
                  {new Date(job.createdAt).toLocaleString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "2-digit",
                    month: "2-digit",
                  })}
                </div>
              </div>
            </div>
          ))}

          {jobs.length === 0 && (
            <div className="py-12 flex flex-col items-center justify-center text-[color:var(--muted)] opacity-50 italic text-sm">
              <History className="h-10 w-10 mb-2 opacity-20" />
              Chưa có lịch sử tự động hóa.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
