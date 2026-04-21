import { prisma } from "@/lib/prisma";
import { revalidateAdminPaths } from "@/lib/revalidate-admin";

export type IngestInboundInput = {
  provider: string;
  externalThreadId: string;
  titleHint?: string;
  body: string;
  externalMessageId?: string;
  rawPayloadJson?: string;
};

/**
 * Lưu tin đến từ webhook: Conversation + ConversationMessage;
 * tin đầu tiên của thread tạo Task CHANNEL_MESSAGE cho inbox duyệt.
 */
export async function ingestInboundChannelMessage(input: IngestInboundInput) {
  const { provider, externalThreadId, titleHint, body, externalMessageId, rawPayloadJson } =
    input;

  const conv = await prisma.conversation.upsert({
    where: {
      provider_externalThreadId: { provider, externalThreadId },
    },
    create: {
      provider,
      externalThreadId,
      title: titleHint?.trim() || `Thread ${externalThreadId.slice(-8)}`,
      openclawSessionKey: `agent:main:${provider.toLowerCase()}:${externalThreadId}`,
    },
    update: {
      ...(titleHint?.trim() ? { title: titleHint.trim() } : {}),
      updatedAt: new Date(),
    },
  });

  const priorCount = await prisma.conversationMessage.count({
    where: { conversationId: conv.id },
  });

  await prisma.conversationMessage.create({
    data: {
      conversationId: conv.id,
      direction: "IN",
      body,
      externalMessageId: externalMessageId ?? null,
      rawPayloadJson: rawPayloadJson ?? null,
    },
  });

  if (priorCount === 0) {
    await prisma.task.create({
      data: {
        type: "CHANNEL_MESSAGE",
        title: `${provider}: ${conv.title ?? externalThreadId}`,
        subtitle: body.slice(0, 240),
        status: "NEW",
        isUrgent: false,
      },
    });
  }

  revalidateAdminPaths();
  return { conversationId: conv.id };
}
