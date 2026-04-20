"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Inbox, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { completeTask, ignoreTask } from "@/lib/tasks";
import { normalizeInboxTaskType } from "@/lib/inbox-task-type";

export type InboxTaskRow = {
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
): "payment" | "booking" | "shipping" {
  const u = normalizeInboxTaskType(raw);
  if (u === "payment_review") return "payment";
  if (u === "booking_confirm") return "booking";
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
    <Card className="border-[color:var(--brand-soft)] bg-[color:var(--surface-strong)] shadow-lg overflow-hidden relative mt-6">
      <div className="absolute top-0 left-0 w-1 h-full bg-[color:var(--brand)]" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Inbox className="h-5 w-5 text-[color:var(--brand)]" />
          {messages.title ?? "Task Approval Queue"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {initialTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-[color:var(--muted)]">
            <div className="mb-4 rounded-full bg-[color:var(--surface-soft)] p-6">
              <Check className="h-8 w-8 opacity-20" />
            </div>
            <p>{messages.emptyInbox ?? "No pending tasks."}</p>
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
                        <AlertCircle className="h-4 w-4 text-[color:var(--brand-strong)] shrink-0" />
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
