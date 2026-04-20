"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AutomationJob } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  enqueueAutomationJob,
  updateAutomationJobStatus,
} from "@/lib/actions/automation-actions";

type Messages = {
  title: string;
  placeholder: string;
  channelPlaceholder: string;
  enqueue: string;
  markDone: string;
  cancel: string;
  empty: string;
};

export function AutomationQueue({
  initialJobs,
  messages,
}: {
  initialJobs: AutomationJob[];
  messages: Messages;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [channel, setChannel] = useState("");

  const add = () => {
    if (!title.trim()) return;
    startTransition(async () => {
      await enqueueAutomationJob(title.trim(), channel.trim() || undefined);
      setTitle("");
      setChannel("");
      router.refresh();
    });
  };

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <Card className="border-[color:var(--brand-soft)] h-fit">
        <CardHeader>
          <CardTitle className="text-base">{messages.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            className="w-full rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-3 py-2 text-sm"
            placeholder={messages.placeholder}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className="w-full rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-3 py-2 text-sm"
            placeholder={messages.channelPlaceholder}
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
          />
          <Button className="w-full rounded-xl" onClick={add} disabled={isPending}>
            {messages.enqueue}
          </Button>
          <p className="text-[11px] text-[color:var(--muted)]">
            Pilot: hàng đợi nội bộ, chưa gọi autopost kênh. Dùng để theo dõi việc cần duyệt / chạy sau.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Danh sách</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {initialJobs.length === 0 ? (
            <p className="text-sm text-[color:var(--muted)]">{messages.empty}</p>
          ) : (
            <ul className="divide-y divide-[color:var(--line)]">
              {initialJobs.map((job) => (
                <li key={job.id} className="py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-medium text-sm">{job.title}</div>
                    <div className="text-xs text-[color:var(--muted)]">
                      {job.channel || "—"} · {new Date(job.createdAt).toLocaleString("vi-VN")}
                    </div>
                    <Badge variant="outline" className="mt-1 text-[10px]">
                      {job.status}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending || job.status === "DONE"}
                      onClick={() => {
                        startTransition(async () => {
                          await updateAutomationJobStatus(job.id, "DONE");
                          router.refresh();
                        });
                      }}
                    >
                      {messages.markDone}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isPending || job.status === "CANCELLED"}
                      onClick={() => {
                        startTransition(async () => {
                          await updateAutomationJobStatus(job.id, "CANCELLED");
                          router.refresh();
                        });
                      }}
                    >
                      {messages.cancel}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
