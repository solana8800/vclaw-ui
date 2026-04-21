"use server";

import { prisma } from "@/lib/prisma";
import { revalidateAdminPaths } from "@/lib/revalidate-admin";

export async function getAutomationJobs() {
  return prisma.automationJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function enqueueAutomationJob(
  title: string,
  channel?: string,
  draftContent?: string | null,
) {
  const draft = draftContent?.trim() || null;
  const approvalStatus =
    draft ? "PENDING_PUBLISH" : channel?.toLowerCase().includes("post") ? "PENDING_PUBLISH" : "NONE";
  await prisma.automationJob.create({
    data: {
      title,
      channel: channel ?? null,
      status: "QUEUED",
      draftContent: draft,
      approvalStatus,
    },
  });
  revalidateAdminPaths();
}

export async function updateAutomationJobStatus(
  id: string,
  status: "QUEUED" | "DONE" | "CANCELLED",
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (status === "DONE") {
    const job = await prisma.automationJob.findUnique({ where: { id } });
    if (job?.approvalStatus === "PENDING_PUBLISH") {
      return { ok: false, error: "approval_required" };
    }
  }
  await prisma.automationJob.update({ where: { id }, data: { status } });
  revalidateAdminPaths();
  return { ok: true };
}

export async function approveAutomationJob(id: string) {
  await prisma.automationJob.update({
    where: { id },
    data: { approvalStatus: "APPROVED" },
  });
  revalidateAdminPaths();
}

export async function rejectAutomationJob(id: string) {
  await prisma.automationJob.update({
    where: { id },
    data: { approvalStatus: "REJECTED", status: "CANCELLED" },
  });
  revalidateAdminPaths();
}
