import { prisma } from "@/lib/db";
import { sendZalouserMessage } from "@/lib/zalouser/zalouser-cli-actions";
import { 
  generateMarketingMessageAction, 
  generateFollowUpAction,
  generateFriendOutreachAction,
  generateGroupOutreachAction
} from "@/lib/actions/ai-actions";

/**
 * Tìm các hội thoại bị dừng (khách chưa trả lời)
 */
export async function getStalledConversations(hours: number = 4) {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

  return prisma.conversation.findMany({
    where: {
      messages: { some: {} },
      updatedAt: { lt: cutoff }
    },
    include: {
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      customer: { include: { orders: { where: { status: "PENDING" } } } }
    }
  });
}

/**
 * 1. Níu kéo hội thoại chung (Khách kẹt)
 */
export async function reengageConversation(conversationId: string) {
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { customer: true }
  });

  if (!conv || !conv.externalThreadId) return { ok: false, error: "not_found" };

  const aiResponse = await generateMarketingMessageAction(conversationId);
  if (!aiResponse.ok || !aiResponse.content) return { ok: false, error: aiResponse.error };

  if (conv.provider === "zalouser") {
    await sendZalouserMessage(conv.externalThreadId, aiResponse.content);
  }

  await prisma.automationJob.create({
    data: {
      title: `Cross-sell: ${conv.customer?.name || conv.externalThreadId}`,
      channel: conv.provider,
      status: "DONE",
      draftContent: aiResponse.content,
      notes: `Tiếp cận chủ động, khách hàng im lặng.`
    }
  });

  return { ok: true, content: aiResponse.content };
}

/**
 * 2. Follow-up Đơn Nháp
 */
async function followUpDraftOrder(conversationId: string, orderId: string) {
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { customer: true }
  });
  if (!conv || !conv.externalThreadId) return { ok: false, error: "not_found" };

  const aiResponse = await generateFollowUpAction(conversationId, orderId);
  if (!aiResponse.ok || !aiResponse.content) return { ok: false, error: aiResponse.error };

  if (conv.provider === "zalouser") {
    await sendZalouserMessage(conv.externalThreadId, aiResponse.content);
  }

  await prisma.automationJob.create({
    data: {
      title: `Follow-up Đơn: ${conv.customer?.name || conv.externalThreadId}`,
      channel: conv.provider,
      status: "DONE",
      draftContent: aiResponse.content,
      notes: `Hối thúc chốt đơn nháp.`
    }
  });

  // Mark order as FOLLOW_UP
  await prisma.order.update({
    where: { id: orderId },
    data: { status: "FOLLOW_UP" }
  });

  return { ok: true, content: aiResponse.content };
}

/**
 * 3. Tiếp cận bạn bè (Kể chuyện kinh doanh)
 */
async function outreachRandomFriend() {
  const peers = await prisma.integrationPeer.findMany({
    where: { provider: "zalouser" },
    take: 50
  });
  if (!peers.length) return { ok: false, error: "no_peers" };

  const randomPeer = peers[Math.floor(Math.random() * peers.length)];
  
  const aiResponse = await generateFriendOutreachAction(randomPeer.name);
  if (!aiResponse.ok || !aiResponse.content) return { ok: false, error: aiResponse.error };

  await sendZalouserMessage(randomPeer.peerId, aiResponse.content);

  await prisma.automationJob.create({
    data: {
      title: `Tiếp Cận Bạn Bè: ${randomPeer.name}`,
      channel: "zalouser",
      status: "DONE",
      draftContent: aiResponse.content,
      notes: `Kể chuyện kinh doanh, quảng bá tự nhiên.`
    }
  });

  return { ok: true, content: aiResponse.content };
}

/**
 * 4. Tương tác Group Chat
 */
async function outreachRandomGroup() {
  const groups = await prisma.integrationGroup.findMany({
    where: { provider: "zalouser" },
    take: 50
  });
  if (!groups.length) return { ok: false, error: "no_groups" };

  const randomGroup = groups[Math.floor(Math.random() * groups.length)];
  
  const aiResponse = await generateGroupOutreachAction(randomGroup.name);
  if (!aiResponse.ok || !aiResponse.content) return { ok: false, error: aiResponse.error };

  await sendZalouserMessage(randomGroup.groupId, aiResponse.content);

  await prisma.automationJob.create({
    data: {
      title: `Tương tác Group: ${randomGroup.name}`,
      channel: "zalouser",
      status: "DONE",
      draftContent: aiResponse.content,
      notes: `Gửi tin khuyến mãi vào nhóm.`
    }
  });

  return { ok: true, content: aiResponse.content };
}

/**
 * Chạy chiến dịch Heartbeat tổng hợp
 */
export async function executeHeartbeat() {
  const results = [];
  
  // 1. Quét khách kẹt
  const stalled = await getStalledConversations(4);
  
  for (const conv of stalled) {
    const draftOrders = conv.customer?.orders?.filter(o => o.status === "PENDING") || [];
    if (draftOrders.length > 0) {
      // Có đơn nháp -> Follow-up
      const res = await followUpDraftOrder(conv.id, draftOrders[0].id);
      results.push({ type: "draft_followup", target: conv.externalThreadId, ...res });
    } else {
      // Không đơn nháp -> Re-engage cross-sell
      const res = await reengageConversation(conv.id);
      results.push({ type: "reengage", target: conv.externalThreadId, ...res });
    }
  }

  // 2. Tiếp cận ngẫu nhiên 1 bạn bè
  const friendRes = await outreachRandomFriend();
  results.push({ type: "spam_friend", ...friendRes });

  // 3. Tương tác ngẫu nhiên 1 nhóm
  const groupRes = await outreachRandomGroup();
  results.push({ type: "spam_group", ...groupRes });

  return results;
}
