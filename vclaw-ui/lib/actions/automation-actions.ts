"use server";

import { prisma } from "@/lib/db";
import { getApprovalConfig } from "@/lib/automation/approval-config";

export async function getAutomationJobs(limit = 10) {
  return prisma.automationJob.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
  });
}

export async function executeHeartbeatAction() {
  const approval = await getApprovalConfig();
  if (!approval.automationEnabled) {
    throw new Error("automation_disabled");
  }
  const { executeHeartbeat } = await import("@/lib/automation/marketing");
  return executeHeartbeat();
}

export async function getStalledCandidates(hours: number = 4) {
  const { getStalledConversations } = await import("@/lib/automation/marketing");
  const { getEnrichedMetadata, resolveDisplayName } = await import("@/lib/channel/metadata-utils");

  const conversations = await getStalledConversations(hours);

  return Promise.all(conversations.map(async (c) => {
    const meta = getEnrichedMetadata(c);

    // Ưu tiên tên khách hàng thật → resolvedTitle → fallback rút gọn
    const rawCustomerName = (c as any).customer?.name || null;
    let customerName = await resolveDisplayName(
      rawCustomerName,
      c.externalThreadId,
      c.provider
    );

    // Nếu vẫn còn dạng "Hội thoại Zalo: <uuid>", rút gọn thành label dễ đọc
    if (!customerName || customerName.startsWith("Hội thoại Zalo:") || customerName.startsWith("Hội thoại")) {
      const resolvedTitle = (c as any).resolvedTitle;
      if (resolvedTitle && !resolvedTitle.startsWith("Hội thoại")) {
        customerName = resolvedTitle;
      } else {
        const shortId = c.externalThreadId.replace(/^(user:|group:)/i, "").slice(0, 8);
        customerName = `Hội thoại …${shortId}`;
      }
    }

    // Sanitize lastMessage: bỏ JSON nội bộ và metadata prefix
    let lastMessage = (c as any).messages?.[0]?.body || "";
    if (lastMessage.trim().startsWith("{") || lastMessage.trim().startsWith("[")) {
      lastMessage = "(Dữ liệu nội bộ)";
    } else {
      lastMessage = lastMessage
        .replace(/Conversation info \(untrusted metadata\):[\s\S]*?```[\s\S]*?```/gi, "")
        .replace(/Sender \(untrusted metadata\):[\s\S]*?```[\s\S]*?```/gi, "")
        .replace(/\(Khách hàng nhắn: "([\s\S]*?)"\. RULE:[\s\S]*/i, "$1")
        .trim()
        .slice(0, 120);
    }

    return {
      id: c.id,
      customerName,
      lastMessage,
      updatedAt: c.updatedAt,
      provider: c.provider,
      ...meta
    };
  }));
}

export async function runMarketingCampaign(ids: string[]) {
  const approval = await getApprovalConfig();
  if (!approval.automationEnabled) {
    throw new Error("automation_disabled");
  }
  const { reengageConversation } = await import("@/lib/automation/marketing");
  const results = [];
  for (const id of ids) {
    results.push(await reengageConversation(id));
  }
  return results;
}
