"use client";

import { CheckCircle2, Clock, Check, MoreVertical, Send } from "lucide-react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { completeTask } from "@/lib/commerce/tasks";
import type { InboxTaskUiType } from "@/lib/commerce/inbox-task-type";

export type InboxTask = {
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
    <Card className="h-full border-[color:var(--line)] shadow-sm">
      <CardHeader className="pb-3 border-b border-[color:var(--line)]">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-[color:var(--line)]">
          {tasks.length === 0 ? (
            <li className="p-8 text-center text-[color:var(--muted)] text-sm italic">
              Không có tác vụ nào cần xử lý.
            </li>
          ) : (
            tasks.map((task) => (
              <li key={task.id} className="p-4 hover:bg-[color:var(--surface-soft)] transition-colors">
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

export type ChatMessage = {
  id: string;
  sender: "customer" | "agent";
  name: string;
  text: string;
  time: string;
  isPhoto?: boolean;
};

export function LiveChatWidget({
  title,
  messages,
}: {
  title: string;
  messages: ChatMessage[];
}) {
  return (
    <Card className="h-full border-[color:var(--line)] shadow-sm bg-[color:var(--surface)] flex flex-col">
      <CardHeader className="pb-3 border-b border-[color:var(--line)]">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-4 flex flex-col justify-end space-y-4 overflow-y-auto">
        {messages.map((msg) => (
          <div key={msg.id} className={cn(
            "flex flex-col max-w-[85%]",
            msg.sender === "agent" ? "self-end items-end" : "self-start items-start"
          )}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-[color:var(--foreground-strong)]">{msg.name}</span>
              <span className="text-[10px] text-[color:var(--muted)]">{msg.time}</span>
            </div>
            <div className={cn(
              "px-3 py-2 rounded-2xl text-sm leading-relaxed",
              msg.sender === "agent" 
                ? "bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)] rounded-tr-sm" 
                : "bg-[color:var(--surface-soft)] text-[color:var(--foreground-strong)] rounded-tl-sm border border-[color:var(--line)]"
            )}>
              {msg.isPhoto ? (
                <div className="flex items-center gap-2 text-xs italic opacity-70">
                   [Hình ảnh đính kèm]
                </div>
              ) : null}
              {msg.text}
            </div>
          </div>
        ))}
      </CardContent>
      <div className="p-3 border-t border-[color:var(--line)] bg-[color:var(--surface-soft)] m-2 rounded-xl flex items-center gap-2">
        <input 
          type="text" 
          placeholder="Nhắn đại diện AI trợ lý..." 
          className="flex-1 bg-transparent border-none outline-none text-sm px-2 text-[color:var(--foreground-strong)] placeholder:text-[color:var(--muted-soft)]"
          disabled
        />
        <Button className="h-8 w-8 p-0 rounded-full bg-[color:var(--brand)] text-white hover:bg-[color:var(--brand-strong)] flex items-center justify-center">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
