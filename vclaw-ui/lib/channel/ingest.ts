import { prisma } from "@/lib/db";
import { revalidateAdminPaths } from "@/lib/admin/revalidate";

export type IngestInboundInput = {
  provider: string;
  externalThreadId: string;
  titleHint?: string;
  body: string;
  externalMessageId?: string;
  rawPayloadJson?: string;
};

const MERGE_WINDOW_MS = 12_000;
const MAX_MERGED_BODY_LENGTH = 6_000;

function mergeInboundBody(previousBody: string, nextBody: string): string {
  const prev = previousBody.trim();
  const next = nextBody.trim();
  if (!prev) return next;
  if (!next) return prev;
  if (prev === next) return prev;
  const merged = `${prev}\n${next}`;
  if (merged.length <= MAX_MERGED_BODY_LENGTH) return merged;
  return merged.slice(0, MAX_MERGED_BODY_LENGTH - 1).trimEnd() + "…";
}

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

  if (externalMessageId) {
    const dup = await prisma.conversationMessage.findFirst({
      where: {
        conversationId: conv.id,
        externalMessageId,
      },
      select: { id: true },
    });
    if (dup) {
      return { conversationId: conv.id, deduped: true };
    }
  }

  const priorCount = await prisma.conversationMessage.count({
    where: { conversationId: conv.id },
  });

  const lastInbound = await prisma.conversationMessage.findFirst({
    where: {
      conversationId: conv.id,
      direction: "IN",
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      body: true,
      createdAt: true,
    },
  });
  const canMerge =
    !!lastInbound &&
    Date.now() - lastInbound.createdAt.getTime() <= MERGE_WINDOW_MS;

  if (canMerge && lastInbound) {
    await prisma.conversationMessage.update({
      where: { id: lastInbound.id },
      data: {
        body: mergeInboundBody(lastInbound.body, body),
        rawPayloadJson: rawPayloadJson ?? undefined,
      },
    });
  } else {
    await prisma.conversationMessage.create({
      data: {
        conversationId: conv.id,
        direction: "IN",
        body,
        externalMessageId: externalMessageId ?? null,
        rawPayloadJson: rawPayloadJson ?? null,
      },
    });
  }

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
  return { conversationId: conv.id, merged: canMerge };
}
