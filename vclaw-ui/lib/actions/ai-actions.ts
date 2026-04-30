"use server";

import { getEnrichedContext } from "@/lib/ai/enrichment";
import { prisma } from "@/lib/db";
import { gateway } from "@/lib/gateway/server";
import { 
  MARKETING_REENGAGEMENT_PROMPT,
  FOLLOWUP_DRAFT_ORDER_PROMPT,
  SPAM_FRIEND_PROMPT,
  SPAM_GROUP_PROMPT
} from "@/lib/ai/marketing-prompts";

export async function enrichChatContext(
  pathname: string,
  userMessage: string,
  externalId?: string,
  source: "admin" | "zalo" = "admin"
): Promise<string> {
  console.info(
    "[vclaw:enrichChatContext]",
    JSON.stringify({
      source,
      pathname,
      ext: externalId ? `${externalId.slice(0, 24)}…` : null,
      msgLen: userMessage.length,
    })
  );
  return getEnrichedContext(pathname, userMessage, externalId, source);
}

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
export async function generateMarketingMessageAction(conversationId: string): Promise<{ ok: boolean; content?: string; error?: string }> {
  try {
    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { 
        messages: { orderBy: { createdAt: "asc" }, take: 20 },
        customer: true 
      }
    });

    if (!conv) return { ok: false, error: "conversation_not_found" };

    const historyText = conv.messages.map(m => `${m.direction === "IN" ? "Khách" : "Bot"}: ${m.body}`).join("\n");
    
    const prompt = `
${MARKETING_REENGAGEMENT_PROMPT}

[LỊCH_SỬ_TRÒ_CHUYỆN]
${historyText}

Hãy viết tin nhắn marketing phù hợp ngay bây giờ:
`.trim();

    return callGateway(prompt);
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

/**
 * Tạo tin nhắn follow-up cho khách có đơn nháp
 */
export async function generateFollowUpAction(conversationId: string, orderId: string): Promise<{ ok: boolean; content?: string; error?: string }> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true }
    });
    if (!order) return { ok: false, error: "order_not_found" };

    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 5 } }
    });

    const historyText = conv?.messages.map(m => `${m.direction === "IN" ? "Khách" : "Bot"}: ${m.body}`).join("\n") || "";

    const prompt = `
${FOLLOWUP_DRAFT_ORDER_PROMPT}

[THÔNG_TIN_ĐƠN_HÀNG]
- Mã đơn: ${order.orderNumber}
- Khách: ${order.customer.name}
- Số tiền: ${order.amount}
- Lịch sử chat gần đây:
${historyText}

Hãy viết tin nhắn follow-up chốt đơn ngay bây giờ:
`.trim();

    return callGateway(prompt);
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

/**
 * Tạo nội dung tiếp cận gửi bạn bè
 */
export async function generateFriendOutreachAction(peerName: string): Promise<{ ok: boolean; content?: string; error?: string }> {
  const prompt = `
${SPAM_FRIEND_PROMPT}

Tên người nhận: ${peerName}

Hãy viết tin nhắn ngay bây giờ:
`.trim();
  return callGateway(prompt);
}

/**
 * Tạo nội dung tiếp cận gửi nhóm
 */
export async function generateGroupOutreachAction(groupName: string): Promise<{ ok: boolean; content?: string; error?: string }> {
  const prompt = `
${SPAM_GROUP_PROMPT}

Tên nhóm: ${groupName}

Hãy viết tin nhắn gửi nhóm ngay bây giờ:
`.trim();
  return callGateway(prompt);
}
