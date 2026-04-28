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
      // Giả sử subtitle có dạng "Tên khách, Dịch vụ (Date Time)"
      // Trong thực tế nên lưu bookingId vào metadata của Task
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
    <Card className="border-amber-200 bg-amber-50/30 dark:bg-amber-950/10 mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <CalendarCheck className="h-4 w-4" />
          Yêu cầu Đặt lịch mới cần xác nhận
        </CardTitle>
        <CardDescription className="text-[11px]">
          Các yêu cầu từ khách hàng qua Zalo/Bot AI đang chờ bạn phê duyệt.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.map((task) => (
          <div 
            key={task.id} 
            className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-black/20 border border-amber-100 dark:border-amber-900/30 shadow-sm"
          >
            <div className="min-w-0">
              <div className="text-xs font-bold text-[color:var(--foreground-strong)]">
                {task.title}
              </div>
              <div className="text-[11px] text-[color:var(--muted)] truncate mt-0.5">
                {task.subtitle}
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-[10px] text-[color:var(--muted)]">
                <Clock className="h-3 w-3" />
                {new Date(task.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
            
            <div className="flex gap-2 shrink-0">
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-8 w-8 p-0 text-red-500 hover:bg-red-50"
                onClick={() => handleReject(task.id)}
                disabled={isPending}
              >
                <X className="h-4 w-4" />
              </Button>
              <Button 
                size="sm" 
                className="h-8 px-3 text-[11px] bg-green-600 hover:bg-green-700 text-white"
                onClick={() => handleApprove(task.id, task.subtitle)}
                disabled={isPending}
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Xác nhận
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
