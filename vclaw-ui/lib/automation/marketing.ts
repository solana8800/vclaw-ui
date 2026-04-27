import { prisma } from "@/lib/db";
import { sendZalouserMessage } from "@/lib/zalouser/zalouser-cli-actions";
import { generateMarketingMessageAction } from "@/lib/actions/ai-actions";

/**
 * Tìm các hội thoại bị dừng (khách chưa trả lời)
 * @param hours Số giờ kể từ tin nhắn cuối cùng của khách
 */
export async function getStalledConversations(hours: number = 4) {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

  // Tìm các hội thoại có tin nhắn cuối cùng là IN và trước thời điểm cutoff
  const conversations = await prisma.conversation.findMany({
    where: {
      messages: {
        some: {}
      },
      updatedAt: {
        lt: cutoff
      }
    },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1
      },
      customer: true
    }
  });

  // Chấp nhận mọi hướng tin nhắn (IN hoặc OUT) để có thể "spam" marketing liên tục
  return conversations;
}

/**
 * Thực hiện gửi tin nhắn marketing cho một hội thoại cụ thể
 */
export async function reengageConversation(conversationId: string) {
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { customer: true }
  });

  if (!conv || !conv.externalThreadId) return { ok: false, error: "not_found" };

  // 1. Dùng AI tạo nội dung marketing cá nhân hóa
  const aiResponse = await generateMarketingMessageAction(conversationId);
  if (!aiResponse.ok || !aiResponse.content) {
    return { ok: false, error: aiResponse.error || "ai_failed" };
  }

  const content = aiResponse.content;

  // 2. Gửi tin nhắn qua kênh tương ứng (Zalo)
  if (conv.provider === "zalouser") {
    const res = await sendZalouserMessage(conv.externalThreadId, content);
    if (!res.success) return { ok: false, error: res.error };
  } else {
    // Các kênh khác (Facebook, OA...) sẽ bổ sung sau
    return { ok: false, error: "provider_not_supported" };
  }

  // 3. Ghi log vào AutomationJob
  await prisma.automationJob.create({
    data: {
      title: `Re-engage: ${conv.customer?.name || conv.externalThreadId}`,
      channel: conv.provider,
      status: "DONE",
      draftContent: content,
      notes: `Tấn công marketing chủ động. Níu kéo khách hàng sau thời gian im lặng.`
    }
  });

  return { ok: true, content };
}
