"use server";

import { prisma } from "@/lib/db";
import { revalidateAdminPaths } from "@/lib/admin/revalidate";
import { getStalledConversations, reengageConversation, executeHeartbeat } from "@/lib/automation/marketing";

export async function getAutomationJobs() {
  return prisma.automationJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

/**
 * Lấy danh sách các hội thoại có thể re-engage
 */
export async function getStalledCandidates(hours: number = 4) {
  const stalled = await getStalledConversations(hours);
  return stalled.map(c => ({
    id: c.id,
    customerName: c.customer?.name || "Khách ẩn danh",
    lastMessage: c.messages[0]?.body || "",
    updatedAt: c.updatedAt,
    provider: c.provider,
  }));
}

/**
 * Chạy chiến dịch marketing nhắn tin lại cho khách
 */
export async function runMarketingCampaign(conversationIds: string[]) {
  const results = [];
  for (const id of conversationIds) {
    const res = await reengageConversation(id);
    results.push({ id, ...res });
  }
  revalidateAdminPaths();
  return results;
}

export async function executeHeartbeatAction() {
  const results = await executeHeartbeat();
  revalidateAdminPaths();
  return results;
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

