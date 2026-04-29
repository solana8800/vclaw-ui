"use client";

import { useState } from "react";
import { 
  History, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  MessageSquare, 
  ArrowRight,
  ExternalLink
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type AutomationJobRow = {
  id: string;
  type: string;
  status: string;
  target: string;
  result?: string | null;
  createdAt: string;
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
            <CardDescription>Các tác vụ đã thực hiện bởi bot AI.</CardDescription>
          </div>
          <Badge variant="outline" className="text-[color:var(--muted)] border-[color:var(--line)]">
            {jobs.length} tác vụ gần đây
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
                  <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-full">
                    <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[color:var(--foreground-strong)] truncate">
                    {job.type === "FOLLOWUP_PAYMENT" ? "Nhắc thanh toán" : 
                     job.type === "REENGAGE_LEAD" ? "Tái kích hoạt Lead" : 
                     job.type === "BOOKING_REMINDER" ? "Nhắc lịch hẹn" : job.type}
                  </span>
                  <Badge className="bg-[color:var(--surface-soft)] text-[color:var(--muted)] border-0 text-[10px] font-normal px-1.5 py-0">
                    ID: {job.id.slice(-4)}
                  </Badge>
                </div>
                <div className="text-xs text-[color:var(--muted)] flex items-center gap-1.5 mt-1">
                  <MessageSquare className="h-3 w-3" />
                  Khách: {job.target}
                </div>
              </div>

              <div className="text-right hidden sm:block">
                <div className="text-xs font-medium text-[color:var(--foreground-strong)]">
                  {job.result || "Đã gửi thành công"}
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
              
              <button className="p-2 text-[color:var(--muted)] hover:text-[color:var(--brand)] transition-colors">
                <ExternalLink className="h-4 w-4" />
              </button>
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
