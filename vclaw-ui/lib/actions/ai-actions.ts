"use server";

import { getEnrichedContext } from "@/lib/ai/enrichment";
import { prisma } from "@/lib/db";
import { gateway } from "@/lib/gateway/server";
import { MARKETING_REENGAGEMENT_PROMPT } from "@/lib/ai/marketing-prompts";

export async function enrichChatContext(
  pathname: string,
  userMessage: string,
  externalId?: string,
  source: "admin" | "zalo" = "admin"
): Promise<string> {
  return getEnrichedContext(pathname, userMessage, externalId, source);
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

    // Gọi gateway để sinh nội dung (không stream)
    const res = await gateway.post<{ choices: { message: { content: string } }[] }>("/chat/completions", {
      model: "default",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const content = res.choices?.[0]?.message?.content?.trim();
    if (!content) return { ok: false, error: "ai_empty_response" };

    return { ok: true, content };
  } catch (error) {
    console.error("Lỗi generateMarketingMessageAction:", error);
    return { ok: false, error: String(error) };
  }
}
