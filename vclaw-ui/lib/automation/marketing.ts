import { prisma } from "@/lib/db";
import { sendZalouserMessage } from "@/lib/zalouser/zalouser-cli-actions";
import {
  generateMarketingMessageAction,
  generateFollowUpAction,
  generateFriendOutreachAction,
  generateGroupOutreachAction,
} from "@/lib/actions/marketing-actions";

export async function getStalledConversations(hours: number = 4) {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

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

export async function reengageConversation(conversationId: string) {
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
      notes: "Khách hàng im lặng — tiếp cận lại tự động.",
    } as any,
  });

  return { ok: sent, content: aiResponse.content, error: sendError };
}

async function followUpDraftOrder(conversationId: string, orderId: string) {
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
      notes: "Hối thúc chốt đơn đang chờ thanh toán.",
    } as any,
  });

  if (sent) {
    await prisma.order.update({ where: { id: orderId }, data: { status: "FOLLOW_UP" } });
  }

  return { ok: sent, content: aiResponse.content, error: sendError };
}

async function outreachRandomFriend() {
  const peers = await prisma.integrationPeer.findMany({
    where: { provider: "zalouser" },
    take: 50,
  });
  if (!peers.length) return { ok: false, error: "no_peers" };

  const peer = peers[Math.floor(Math.random() * peers.length)];

  const aiResponse = await generateFriendOutreachAction(peer.name);
  if (!aiResponse.ok || !aiResponse.content) return { ok: false, error: aiResponse.error };

  const { sent, error: sendError } = await trySend("zalouser", peer.peerId, aiResponse.content);

  await prisma.automationJob.create({
    data: {
      title: `Kết nối bạn bè: ${peer.name}`,
      channel: "zalouser",
      target: peer.name,
      status: sent ? "DONE" : "FAILED",
      result: sent ? "Đã gửi thành công" : `Lỗi: ${sendError}`,
      draftContent: aiResponse.content,
      notes: "Quảng bá tự nhiên qua bạn bè Zalo.",
    } as any,
  });

  return { ok: sent, content: aiResponse.content };
}

async function outreachRandomGroup() {
  const groups = await prisma.integrationGroup.findMany({
    where: { provider: "zalouser" },
    take: 50,
  });
  if (!groups.length) return { ok: false, error: "no_groups" };

  const group = groups[Math.floor(Math.random() * groups.length)];

  const aiResponse = await generateGroupOutreachAction(group.name);
  if (!aiResponse.ok || !aiResponse.content) return { ok: false, error: aiResponse.error };

  const { sent, error: sendError } = await trySend("zalouser", group.groupId, aiResponse.content);

  await prisma.automationJob.create({
    data: {
      title: `Tương tác nhóm: ${group.name}`,
      channel: "zalouser",
      target: group.name,
      status: sent ? "DONE" : "FAILED",
      result: sent ? "Đã gửi thành công" : `Lỗi: ${sendError}`,
      draftContent: aiResponse.content,
      notes: "Gửi tin vào nhóm Zalo.",
    } as any,
  });

  return { ok: sent, content: aiResponse.content };
}

export async function executeHeartbeat() {
  const results = [];

  const stalled = await getStalledConversations(4);

  for (const conv of stalled) {
    const draftOrders = conv.customer?.orders?.filter((o) => o.status === "PENDING") || [];
    if (draftOrders.length > 0) {
      const res = await followUpDraftOrder(conv.id, draftOrders[0].id);
      results.push({ type: "draft_followup", target: conv.externalThreadId, ...res });
    } else {
      const res = await reengageConversation(conv.id);
      results.push({ type: "reengage", target: conv.externalThreadId, ...res });
    }
  }

  const friendRes = await outreachRandomFriend();
  results.push({ type: "spam_friend", ...friendRes });

  const groupRes = await outreachRandomGroup();
  results.push({ type: "spam_group", ...groupRes });

  return results;
}
