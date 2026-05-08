import { prisma } from "@/lib/db";
import { sendZalouserMessage } from "@/lib/zalouser/zalouser-cli-actions";
import {
  generateMarketingMessageAction,
  generateFollowUpAction,
} from "@/lib/actions/marketing-actions";
import { getAutomationRules, type AutomationRulesConfig } from "@/lib/actions/shop-settings-actions";
import { getApprovalConfig } from "@/lib/automation/approval-config";

type AutomationRuleConfig = AutomationRulesConfig[keyof AutomationRulesConfig];

const HOUR_MS = 60 * 60 * 1000;

export async function getStalledConversations(hours: number = 4) {
  const cutoff = new Date(Date.now() - hours * HOUR_MS);

  return prisma.conversation.findMany({
    where: {
      messages: { some: {} },
      updatedAt: { lt: cutoff },
    },
    include: {
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      customer: { include: { orders: { where: { status: "PENDING" } } } },
    },
  });
}

function delayToHours(rule: AutomationRuleConfig) {
  const value = Math.max(0, Number(rule.delayValue) || 0);
  return rule.delayUnit === "days" ? value * 24 : value;
}

function ruleMarker(rule: keyof AutomationRulesConfig, id: string) {
  return `rule:${rule};${id}`;
}

async function hasExistingJob(marker: string) {
  const existing = await prisma.automationJob.findFirst({
    where: { notes: { contains: marker } },
  });
  return Boolean(existing);
}

async function trySend(provider: string, threadId: string, content: string): Promise<{ sent: boolean; error?: string }> {
  if (provider !== "zalouser") {
    return { sent: false, error: `provider_not_supported:${provider}` };
  }
  try {
    await sendZalouserMessage(threadId, content);
    return { sent: true };
  } catch (e: any) {
    return { sent: false, error: e?.message ?? "send_failed" };
  }
}

export async function reengageConversation(conversationId: string, options?: { notes?: string }) {
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { customer: true },
  });

  if (!conv || !conv.externalThreadId) return { ok: false, error: "not_found" };

  const aiResponse = await generateMarketingMessageAction(conversationId);
  if (!aiResponse.ok || !aiResponse.content) return { ok: false, error: aiResponse.error };

  const { sent, error: sendError } = await trySend(conv.provider, conv.externalThreadId, aiResponse.content);

  await prisma.automationJob.create({
    data: {
      title: `Tái tiếp cận: ${conv.customer?.name || conv.externalThreadId.slice(0, 12)}`,
      channel: conv.provider,
      target: conv.customer?.name || conv.externalThreadId,
      status: sent ? "DONE" : "FAILED",
      result: sent ? "Đã gửi thành công" : `Lỗi: ${sendError}`,
      draftContent: aiResponse.content,
      notes: options?.notes ?? "Khách hàng im lặng — tiếp cận lại tự động.",
    } as any,
  });

  return { ok: sent, content: aiResponse.content, error: sendError };
}

async function followUpDraftOrder(conversationId: string, orderId: string, options?: { notes?: string }) {
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { customer: true },
  });
  if (!conv || !conv.externalThreadId) return { ok: false, error: "not_found" };

  const aiResponse = await generateFollowUpAction(conversationId, orderId);
  if (!aiResponse.ok || !aiResponse.content) return { ok: false, error: aiResponse.error };

  const { sent, error: sendError } = await trySend(conv.provider, conv.externalThreadId, aiResponse.content);

  await prisma.automationJob.create({
    data: {
      title: `Follow-up đơn: ${conv.customer?.name || conv.externalThreadId.slice(0, 12)}`,
      channel: conv.provider,
      target: conv.customer?.name || conv.externalThreadId,
      status: sent ? "DONE" : "FAILED",
      result: sent ? "Đã gửi thành công" : `Lỗi: ${sendError}`,
      draftContent: aiResponse.content,
      notes: options?.notes ?? "Hối thúc chốt đơn đang chờ thanh toán.",
    } as any,
  });

  if (sent) {
    await prisma.order.update({ where: { id: orderId }, data: { status: "FOLLOW_UP" } });
  }

  return { ok: sent, content: aiResponse.content, error: sendError };
}

async function runPaymentFollowup(rule: AutomationRuleConfig) {
  const results = [];
  const stalled = await getStalledConversations(delayToHours(rule));

  for (const conv of stalled) {
    const draftOrders = conv.customer?.orders?.filter((o) => o.status === "PENDING") || [];
    for (const order of draftOrders) {
      const marker = ruleMarker("paymentFollowup", `order:${order.id}`);
      if (await hasExistingJob(marker)) {
        results.push({ type: "payment_followup", target: conv.externalThreadId, skipped: true, reason: "already_sent" });
        continue;
      }
      const res = await followUpDraftOrder(conv.id, order.id, {
        notes: `${marker}; Hối thúc khách gửi bill cho đơn đang chờ thanh toán.`,
      });
      results.push({ type: "payment_followup", target: conv.externalThreadId, ...res });
    }
  }
  return results;
}

async function runLeadReactivation(rule: AutomationRuleConfig) {
  const results = [];
  const stalled = await getStalledConversations(delayToHours(rule));

  for (const conv of stalled) {
    const draftOrders = conv.customer?.orders?.filter((o) => o.status === "PENDING") || [];
    if (draftOrders.length > 0) continue;

    const marker = ruleMarker("leadReactivation", `conversation:${conv.id}`);
    if (await hasExistingJob(marker)) {
      results.push({ type: "lead_reactivation", target: conv.externalThreadId, skipped: true, reason: "already_sent" });
      continue;
    }
    const res = await reengageConversation(conv.id, {
      notes: `${marker}; Khách hàng im lặng quá thời gian cấu hình — tiếp cận lại tự động.`,
    });
    results.push({ type: "lead_reactivation", target: conv.externalThreadId, ...res });
  }

  return results;
}

function formatAppointmentTime(value: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(value);
}

async function runAppointmentReminder(rule: AutomationRuleConfig) {
  const results = [];
  const now = new Date();
  const until = new Date(now.getTime() + delayToHours(rule) * HOUR_MS);
  const bookings = await prisma.booking.findMany({
    where: {
      status: { in: ["PENDING", "CONFIRMED", "SCHEDULED"] },
      startTime: { gte: now, lte: until },
    },
    include: { customer: true },
    orderBy: { startTime: "asc" },
    take: 50,
  });

  for (const booking of bookings) {
    const marker = ruleMarker("appointmentReminder", `booking:${booking.id}`);
    if (await hasExistingJob(marker)) {
      results.push({ type: "appointment_reminder", target: booking.id, skipped: true, reason: "already_sent" });
      continue;
    }

    const conv = await prisma.conversation.findFirst({
      where: {
        provider: "zalouser",
        customerId: booking.customerId,
      },
      orderBy: { updatedAt: "desc" },
    });
    if (!conv?.externalThreadId) {
      await prisma.automationJob.create({
        data: {
          title: `Nhắc lịch hẹn: ${booking.customer?.name || booking.id}`,
          channel: "zalouser",
          target: booking.customer?.name || booking.id,
          status: "FAILED",
          result: "Không tìm thấy hội thoại Zalo để gửi nhắc lịch.",
          notes: `${marker}; Không có conversation Zalo cho booking.`,
        } as any,
      });
      results.push({ type: "appointment_reminder", target: booking.id, ok: false, error: "conversation_not_found" });
      continue;
    }

    const content = `Dạ em nhắc lịch ${booking.serviceName} lúc ${formatAppointmentTime(booking.startTime)}. Anh/chị xác nhận giúp shop để giữ lịch nhé.`;
    const { sent, error: sendError } = await trySend(conv.provider, conv.externalThreadId, content);
    await prisma.automationJob.create({
      data: {
        title: `Nhắc lịch hẹn: ${booking.customer?.name || conv.externalThreadId.slice(0, 12)}`,
        channel: conv.provider,
        target: booking.customer?.name || conv.externalThreadId,
        status: sent ? "DONE" : "FAILED",
        result: sent ? "Đã gửi thành công" : `Lỗi: ${sendError}`,
        draftContent: content,
        notes: `${marker}; Nhắc lịch hẹn tự động.`,
      } as any,
    });
    results.push({ type: "appointment_reminder", target: conv.externalThreadId, ok: sent, content, error: sendError });
  }

  return results;
}

export async function executeHeartbeat() {
  const approval = await getApprovalConfig();
  if (!approval.automationEnabled) {
    return [{ type: "automation_gate", skipped: true, ok: false, error: "automation_disabled" }];
  }

  const rules = await getAutomationRules();
  const results = [];

  if (rules.paymentFollowup.enabled) {
    results.push(...await runPaymentFollowup(rules.paymentFollowup));
  }
  if (rules.appointmentReminder.enabled) {
    results.push(...await runAppointmentReminder(rules.appointmentReminder));
  }
  if (rules.leadReactivation.enabled) {
    results.push(...await runLeadReactivation(rules.leadReactivation));
  }

  return results;
}
