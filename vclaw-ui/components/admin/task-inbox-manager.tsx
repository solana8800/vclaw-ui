"use client";

import { useState } from "react";
import { Check, X, Edit, Inbox, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type TaskStatus = "pending" | "approved" | "rejected";

interface InboxTask {
  id: string;
  type: "payment" | "booking" | "shipping";
  title: string;
  description: string;
  amount?: string;
  time: string;
  status: TaskStatus;
}

export function TaskInboxManager({ messages }: { messages: any }) {
  const [tasks, setTasks] = useState<InboxTask[]>([
    {
      id: "t1",
      type: "payment",
      title: "Review VietQR Transfer",
      description: "Order #DH1234 - Match found. Awaiting your approval.",
      amount: "1,200,000 đ",
      time: "5 mins ago",
      status: "pending",
    },
    {
      id: "t2",
      type: "shipping",
      title: "Confirm Shipping Quote",
      description: "Order #DH1235 - Normalization done. GHN quoted 35,000 đ.",
      time: "15 mins ago",
      status: "pending",
    },
    {
      id: "t3",
      type: "booking",
      title: "New Booking Request",
      description: "Customer wants 15:00 slot tomorrow for Consultation.",
      time: "1 hour ago",
      status: "pending",
    },
  ]);

  const pendingTasks = tasks.filter((t) => t.status === "pending");

  const handleAction = (id: string, action: TaskStatus) => {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, status: action } : t)));
  };

  return (
    <Card className="border-[color:var(--brand-soft)] bg-[color:var(--surface-strong)] shadow-lg overflow-hidden relative mt-6">
      <div className="absolute top-0 left-0 w-1 h-full bg-[color:var(--brand)]" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Inbox className="h-5 w-5 text-[color:var(--brand)]" />
          {messages?.title || "Task Approval Queue"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pendingTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-[color:var(--muted)]">
            <div className="mb-4 rounded-full bg-[color:var(--surface-soft)] p-6">
              <Check className="h-8 w-8 opacity-20" />
            </div>
            <p>{messages?.emptyInbox || "No pending tasks."}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingTasks.map((task) => (
              <div
                key={task.id}
                className="group relative rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-4 transition-all hover:border-[color:var(--brand-soft)] hover:shadow-md animate-in fade-in slide-in-from-bottom-2"
              >
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-[color:var(--brand-strong)]" />
                      <h4 className="font-semibold text-[color:var(--foreground-strong)]">
                        {task.title}
                      </h4>
                      <span className="text-xs text-[color:var(--muted)] ml-2">
                        {task.time}
                      </span>
                    </div>
                    <p className="text-sm text-[color:var(--foreground)] opacity-90">
                      {task.description}
                    </p>
                    {task.amount && (
                      <div className="text-sm font-medium text-[color:var(--brand)] mt-1">
                        {task.amount}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 sm:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-[color:var(--line)] text-[color:var(--foreground)] hover:bg-[color:var(--surface-strong)]"
                      onClick={() => handleAction(task.id, "rejected")}
                    >
                      <X className="h-4 w-4 mr-1" />
                      {messages?.reject || "Reject"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-[color:var(--line)] text-[color:var(--foreground)] hover:bg-[color:var(--surface-strong)]"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      {messages?.edit || "Edit"}
                    </Button>
                    <Button
                      size="sm"
                      className="bg-[image:var(--brand-gradient)] text-white shadow-sm hover:opacity-90"
                      onClick={() => handleAction(task.id, "approved")}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      {messages?.approve || "Approve"}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
