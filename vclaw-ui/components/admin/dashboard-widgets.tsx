"use client";

import { CheckCircle2, Clock, Check, MoreVertical, Send } from "lucide-react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/shared";
import { completeTask } from "@/lib/commerce/tasks";
import type { InboxTaskUiType } from "@/lib/commerce/inbox-task-type";

type InboxTask = {
  id: string;
  type: InboxTaskUiType;
  title: string;
  subtitle: string;
  amount?: string;
  timeAgo: string;
  isUrgent?: boolean;
};

export function TaskInboxWidget({
  title,
  tasks,
}: {
  title: string;
  tasks: InboxTask[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleApprove = (id: string) => {
    startTransition(async () => {
      try {
        await completeTask(id);
        router.refresh();
      } catch (error) {
        console.error("Lỗi khi duyệt tác vụ:", error);
      }
    });
  };

  return (
    <Card className="h-full overflow-hidden border-[color:var(--line)] shadow-[0_20px_50px_-40px_var(--shadow-color)]">
      <CardHeader className="border-b border-[color:var(--line)] bg-[color:var(--surface-soft)]/50 pb-3">
        <CardTitle className="text-lg font-semibold text-[color:var(--foreground-strong)]">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-[color:var(--line)]">
          {tasks.length === 0 ? (
            <li className="p-8 text-center text-[color:var(--muted)] text-sm italic">
              Không có tác vụ nào cần xử lý.
            </li>
          ) : (
            tasks.map((task) => (
              <li
                key={task.id}
                className="p-4 transition-colors duration-200 hover:bg-[color:var(--surface-soft)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "mt-0.5 rounded-full p-1.5",
                        task.type === "payment_review"
                          ? "bg-green-100 text-green-600"
                          : task.type === "booking_confirm"
                            ? "bg-blue-100 text-blue-600"
                            : task.type === "channel_message"
                              ? "bg-violet-100 text-violet-600"
                              : "bg-orange-100 text-orange-600",
                      )}
                    >
                      {task.type === "payment_review" ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : task.type === "booking_confirm" ? (
                        <Clock className="w-5 h-5" />
                      ) : task.type === "channel_message" ? (
                        <Send className="w-5 h-5" />
                      ) : (
                        <Check className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-[color:var(--foreground-strong)]">{task.title}</h4>
                      <p className="mt-0.5 text-xs text-[color:var(--muted)]">{task.subtitle}</p>
                      {task.amount ? (
                        <p className="mt-1.5 font-semibold text-sm">{task.amount}</p>
                      ) : null}
                      <div className="mt-2 text-[11px] text-[color:var(--muted)] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {task.timeAgo}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-between h-full space-y-4">
                    <Button variant="ghost" className="h-6 w-6 p-0 rounded-full flex items-center justify-center">
                      <MoreVertical className="w-4 h-4 text-[color:var(--muted)]" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant={task.isUrgent ? "primary" : "outline"} 
                      className={cn(
                        "h-8 text-xs rounded-lg px-4",
                        task.isUrgent ? "bg-[color:var(--brand)] text-white hover:bg-[color:var(--brand-strong)]" : ""
                      )}
                      disabled={isPending}
                      onClick={() => handleApprove(task.id)}
                    >
                      {isPending ? "Đang duyệt..." : "Duyệt"}
                    </Button>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
