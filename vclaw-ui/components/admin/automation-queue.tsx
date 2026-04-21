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
  approveAutomationJob,
  rejectAutomationJob,
} from "@/lib/actions/automation-actions";

type Messages = {
  title: string;
  placeholder: string;
  channelPlaceholder: string;
  draftLabel: string;
  draftPlaceholder: string;
  enqueue: string;
  markDone: string;
  cancel: string;
  empty: string;
  pilotNote: string;
  approvePublish: string;
  rejectDraft: string;
  approvalPending: string;
  approvalApproved: string;
  approvalRejected: string;
  approvalNone: string;
  needApproveBeforeDone: string;
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
  const [draft, setDraft] = useState("");

  const add = () => {
    if (!title.trim()) return;
    startTransition(async () => {
      try {
        await enqueueAutomationJob(title.trim(), channel.trim() || undefined, draft.trim() || null);
        setTitle("");
        setChannel("");
        setDraft("");
        router.refresh();
      } catch (e) {
        console.error(e);
      }
    });
  };

  const approvalLabel = (s: string) => {
    if (s === "PENDING_PUBLISH") return messages.approvalPending;
    if (s === "APPROVED") return messages.approvalApproved;
    if (s === "REJECTED") return messages.approvalRejected;
    return messages.approvalNone;
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
          <label className="text-xs font-medium text-[color:var(--muted)]">{messages.draftLabel}</label>
          <textarea
            className="w-full min-h-[88px] rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-3 py-2 text-sm"
            placeholder={messages.draftPlaceholder}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button className="w-full rounded-xl" onClick={add} disabled={isPending}>
            {messages.enqueue}
          </Button>
          <p className="text-[11px] text-[color:var(--muted)]">{messages.pilotNote}</p>
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
              {initialJobs.map((job) => {
                const pendingApproval = job.approvalStatus === "PENDING_PUBLISH";
                const canMarkDone =
                  job.status !== "DONE" &&
                  job.status !== "CANCELLED" &&
                  job.approvalStatus !== "PENDING_PUBLISH";
                return (
                  <li
                    key={job.id}
                    className="py-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-sm">{job.title}</div>
                      <div className="text-xs text-[color:var(--muted)]">
                        {job.channel || "—"} · {new Date(job.createdAt).toLocaleString("vi-VN")}
                      </div>
                      {job.draftContent ? (
                        <p className="text-xs mt-2 text-[color:var(--foreground)] line-clamp-4 whitespace-pre-wrap border-l-2 border-[color:var(--brand)] pl-2">
                          {job.draftContent}
                        </p>
                      ) : null}
                      <div className="flex flex-wrap gap-1 mt-2">
                        <Badge variant="outline" className="text-[10px]">
                          {job.status}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] bg-[color:var(--surface-soft)]">
                          {approvalLabel(job.approvalStatus)}
                        </Badge>
                      </div>
                      {pendingApproval ? (
                        <p className="text-[10px] text-amber-600 mt-1">{messages.needApproveBeforeDone}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      {pendingApproval ? (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={isPending}
                            onClick={() => {
                              startTransition(async () => {
                                await approveAutomationJob(job.id);
                                router.refresh();
                              });
                            }}
                          >
                            {messages.approvePublish}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={isPending}
                            onClick={() => {
                              startTransition(async () => {
                                await rejectAutomationJob(job.id);
                                router.refresh();
                              });
                            }}
                          >
                            {messages.rejectDraft}
                          </Button>
                        </>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending || job.status === "DONE" || !canMarkDone}
                        title={pendingApproval ? messages.needApproveBeforeDone : undefined}
                        onClick={() => {
                          startTransition(async () => {
                            const res = await updateAutomationJobStatus(job.id, "DONE");
                            if (!res.ok) {
                              console.warn(res.error);
                              return;
                            }
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
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
