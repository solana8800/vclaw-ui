"use server";

import { prisma } from "@/lib/db";

export async function getAutomationJobs(limit = 10) {
  return prisma.automationJob.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
  });
}

export async function enqueueAutomationJob(titleOrData: any, channel?: string, draftContent?: string) {
  const data = typeof titleOrData === 'object' ? titleOrData : {
    title: titleOrData,
    channel,
    draftContent,
    needsApproval: true
  };

  const job = await prisma.automationJob.create({
    data: {
      type: data.type || "MARKETING",
      status: "QUEUED",
      target: data.target || "BROADCAST",
      channel: data.channel || "Zalo",
      title: data.title || "Tác vụ mới",
      draftContent: data.draftContent,
      approvalStatus: data.needsApproval !== false ? "PENDING_PUBLISH" : "AUTO_APPROVED",
    } as any
  });
  return { success: true, job };
}

export async function updateAutomationJobStatus(id: string, status: string) {
  await prisma.automationJob.update({
    where: { id },
    data: { status }
  });
  return { success: true };
}

export async function approveAutomationJob(id: string) {
  await prisma.automationJob.update({
    where: { id },
    data: { approvalStatus: "APPROVED", status: "QUEUED" }
  });
  return { success: true };
}

export async function rejectAutomationJob(id: string) {
  await prisma.automationJob.update({
    where: { id },
    data: { approvalStatus: "REJECTED", status: "FAILED" }
  });
  return { success: true };
}

export async function executeHeartbeatAction() {
  const { executeHeartbeat } = await import("@/lib/automation/marketing");
  return executeHeartbeat();
}

export async function getStalledCandidates(hours: number = 4) {
  const { getStalledConversations } = await import("@/lib/automation/marketing");
  const conversations = await getStalledConversations(hours);
  return conversations.map(c => ({
    id: c.id,
    customerName: (c as any).customer?.name || "Khách lạ",
    lastMessage: (c as any).messages[0]?.body || "",
    updatedAt: c.updatedAt,
    provider: c.provider
  }));
}

export async function runMarketingCampaign(ids: string[]) {
  const { reengageConversation } = await import("@/lib/automation/marketing");
  const results = [];
  for (const id of ids) {
    results.push(await reengageConversation(id));
  }
  return results;
}
