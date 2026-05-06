"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Inbox, AlertCircle, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/shared/utils";
import { completeTask, ignoreTask } from "@/lib/commerce/tasks";
import { normalizeInboxTaskType } from "@/lib/commerce/inbox-task-type";

type InboxTaskRow = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  amount?: string | null;
  timeAgo: string | null;
  isUrgent: boolean;
};

type InboxManagerMessages = {
  title?: string;
  emptyInbox?: string;
  approve?: string;
  reject?: string;
};

function toDisplayType(
  raw: string,
): "payment" | "booking" | "shipping" | "channel" {
  const u = normalizeInboxTaskType(raw);
  if (u === "payment_review") return "payment";
  if (u === "booking_confirm") return "booking";
  if (u === "channel_message") return "channel";
  return "shipping";
}

export function TaskInboxManager({
  messages,
  initialTasks,
}: {
  messages: InboxManagerMessages;
  initialTasks: InboxTaskRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEmpty = initialTasks.length === 0;

  const handleApprove = (id: string) => {
    startTransition(async () => {
      try {
        await completeTask(id);
        router.refresh();
      } catch (e) {
        console.error(e);
      }
    });
  };

  const handleReject = (id: string) => {
    startTransition(async () => {
      try {
        await ignoreTask(id);
        router.refresh();
      } catch (e) {
        console.error(e);
      }
    });
  };

  return (
    <Card className={cn(
      "border-[color:var(--brand-soft)] shadow-lg overflow-hidden relative transition-all duration-300",
      isEmpty ? "bg-[color:var(--surface)] border-dashed opacity-80 hover:opacity-100" : "bg-[color:var(--surface-strong)] mt-2"
    )}>
      <div className={cn(
        "absolute top-0 left-0 w-1 h-full",
        isEmpty ? "bg-[color:var(--line)]" : "bg-[color:var(--brand)]"
      )} />
      
      {!isEmpty && (
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Inbox className="h-5 w-5 text-[color:var(--brand)]" />
            {messages.title ?? "Hàng đợi Phê duyệt"}
          </CardTitle>
        </CardHeader>
      )}

      <CardContent className={cn(isEmpty ? "py-3 px-4" : "pt-2")}>
        {isEmpty ? (
          <div className="flex items-center justify-between text-[color:var(--muted)]">
             <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-[color:var(--surface-soft)] flex items-center justify-center">
                  <Check className="h-4 w-4 text-emerald-500/70" />
                </div>
                <p className="text-xs font-medium italic">{messages.emptyInbox ?? "Tuyệt vời! Không có tác vụ nào đang chờ duyệt."}</p>
             </div>
             <Badge variant="outline" className="text-[9px] opacity-50 uppercase tracking-tighter">Sẵn sàng</Badge>
          </div>
        ) : (
          <div className="space-y-4">
            {initialTasks.map((task) => {
              const displayType = toDisplayType(task.type);
              return (
                <div
                  key={task.id}
                  className="group relative rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-4 transition-all hover:border-[color:var(--brand-soft)] hover:shadow-md animate-in fade-in slide-in-from-bottom-2"
                >
                  <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {displayType === "channel" ? (
                          <MessageSquare className="h-4 w-4 text-[color:var(--brand-strong)] shrink-0" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-[color:var(--brand-strong)] shrink-0" />
                        )}
                        <h4 className="font-semibold text-[color:var(--foreground-strong)]">
                          {task.title}
                        </h4>
                        <span className="text-xs text-[color:var(--muted)]">
                          {task.timeAgo ?? "—"}
                        </span>
                        <span className="text-[10px] uppercase tracking-wide text-[color:var(--muted)]">
                          {displayType}
                        </span>
                      </div>
                      <p className="text-sm text-[color:var(--foreground)] opacity-90">
                        {task.subtitle}
                      </p>
                      {task.amount ? (
                        <div className="text-sm font-medium text-[color:var(--brand)] mt-1">
                          {task.amount}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 sm:self-center">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-[color:var(--line)] text-[color:var(--foreground)] hover:bg-[color:var(--surface-strong)]"
                        disabled={isPending}
                        onClick={() => handleReject(task.id)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        {messages.reject ?? "Reject"}
                      </Button>
                      <Button
                        size="sm"
                        className="bg-[image:var(--brand-gradient)] text-white shadow-sm hover:opacity-90"
                        disabled={isPending}
                        onClick={() => handleApprove(task.id)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        {messages.approve ?? "Approve"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
