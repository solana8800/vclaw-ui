"use server";

import { prisma } from "@/lib/db";
import { gateway } from "@/lib/gateway/server";
import {
  buildMarketingReengagementPrompt,
  buildFollowUpPrompt,
  buildFriendOutreachPrompt,
  buildGroupOutreachPrompt,
} from "@/lib/ai/marketing-prompts";

async function callGateway(prompt: string): Promise<{ ok: boolean; content?: string; error?: string }> {
  try {
    const res = await gateway.post<{ choices: { message: { content: string } }[] }>("/v1/chat/completions", {
      model: "openclaw",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });
    const content = res.choices?.[0]?.message?.content?.trim();
    if (!content) return { ok: false, error: "ai_empty_response" };
    return { ok: true, content };
  } catch (error) {
    console.error("Lỗi gọi Gateway AI:", error);
    return { ok: false, error: String(error) };
  }
}

/**
 * Tạo tin nhắn marketing tự động dựa trên lịch sử hội thoại
 */
export async function generateMarketingMessageAction(
  conversationId: string,
): Promise<{ ok: boolean; content?: string; error?: string }> {
  try {
    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: { orderBy: { createdAt: "asc" }, take: 20 },
        customer: true,
      },
    });

    if (!conv) return { ok: false, error: "conversation_not_found" };

    const historyText = conv.messages
      .map((m) => `${m.direction === "IN" ? "Khách" : "Bot"}: ${m.body}`)
      .join("\n");

    const prompt = buildMarketingReengagementPrompt(historyText);

    return callGateway(prompt);
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

/**
 * Tạo tin nhắn follow-up cho khách có đơn nháp
 */
export async function generateFollowUpAction(
  conversationId: string,
  orderId: string,
): Promise<{ ok: boolean; content?: string; error?: string }> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true },
    });
    if (!order) return { ok: false, error: "order_not_found" };

    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 5 } },
    });

    const historyText =
      conv?.messages.map((m) => `${m.direction === "IN" ? "Khách" : "Bot"}: ${m.body}`).join("\n") || "";

    const prompt = buildFollowUpPrompt(
      {
        orderNumber: order.orderNumber,
        customerName: order.customer.name,
        amount: order.amount,
      },
      historyText
    );

    return callGateway(prompt);
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

/**
 * Tạo nội dung tiếp cận gửi bạn bè
 */
export async function generateFriendOutreachAction(
  peerName: string,
): Promise<{ ok: boolean; content?: string; error?: string }> {
  const prompt = buildFriendOutreachPrompt(peerName);
  return callGateway(prompt);
}

/**
 * Tạo nội dung tiếp cận gửi nhóm
 */
export async function generateGroupOutreachAction(
  groupName: string,
): Promise<{ ok: boolean; content?: string; error?: string }> {
  const prompt = buildGroupOutreachPrompt(groupName);
  return callGateway(prompt);
}

