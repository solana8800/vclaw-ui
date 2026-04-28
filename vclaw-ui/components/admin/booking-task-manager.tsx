"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, Check, X, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { completeTask, ignoreTask } from "@/lib/commerce/tasks";
import { updateBookingStatus } from "@/lib/actions/booking-actions";

export type BookingTask = {
  id: string;
  title: string;
  subtitle: string | null;
  createdAt: Date;
};

export function BookingTaskManager({ 
  tasks = [] 
}: { 
  tasks: BookingTask[] 
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleApprove = (taskId: string, subtitle: string | null) => {
    startTransition(async () => {
      await completeTask(taskId);
      router.refresh();
    });
  };

  const handleReject = (taskId: string) => {
    startTransition(async () => {
      await ignoreTask(taskId);
      router.refresh();
    });
  };

  if (tasks.length === 0) return null;

  return (
    <Card className="border-[color:var(--brand-soft)] bg-[color:var(--surface-strong)] shadow-lg overflow-hidden relative mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="absolute top-0 left-0 w-1 h-full bg-[color:var(--brand)]" />
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--brand-soft)] text-[color:var(--brand)] shadow-inner">
            <CalendarCheck className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base font-bold tracking-tight text-[color:var(--foreground-strong)]">
              Yêu cầu Đặt lịch mới cần xác nhận
            </CardTitle>
            <CardDescription className="text-xs text-[color:var(--muted)] mt-0.5">
              Các yêu cầu từ khách hàng qua Zalo/Bot AI đang chờ bạn phê duyệt.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-6 pb-6">
        {tasks.map((task) => (
          <div 
            key={task.id} 
            className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-[color:var(--surface-soft)] border border-[color:var(--line)] shadow-sm transition-all hover:shadow-md hover:border-[color:var(--brand-soft)] relative overflow-hidden"
          >
            {/* Subtle background glow on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-[color:var(--brand-soft)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="relative min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-widest px-1.5 py-0 border-[color:var(--brand-soft)] text-[color:var(--brand)] bg-white/50 dark:bg-black/50">
                  New Request
                </Badge>
                <div className="flex items-center gap-1.5 text-[10px] text-[color:var(--muted)] font-medium">
                  <Clock className="h-3 w-3" />
                  {new Date(task.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              <div className="text-sm font-bold text-[color:var(--foreground-strong)] leading-tight">
                {task.title}
              </div>
              <div className="text-xs text-[color:var(--muted)] line-clamp-1 italic">
                {task.subtitle}
              </div>
            </div>
            
            <div className="relative flex gap-3 mt-4 sm:mt-0 shrink-0">
              <Button 
                size="sm" 
                variant="outline" 
                className="h-9 px-4 rounded-xl border-[color:var(--line-strong)] text-[color:var(--muted)] hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-all active:scale-95"
                onClick={() => handleReject(task.id)}
                disabled={isPending}
              >
                <X className="h-4 w-4 mr-1.5" />
                Từ chối
              </Button>
              <Button 
                size="sm" 
                className="h-9 px-5 rounded-xl bg-[image:var(--brand-gradient)] text-white shadow-md hover:opacity-90 hover:shadow-lg transition-all active:scale-95 font-bold text-xs"
                onClick={() => handleApprove(task.id, task.subtitle)}
                disabled={isPending}
              >
                <Check className="h-4 w-4 mr-1.5" />
                Xác nhận lịch
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
