import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export type ConversationWithLastMessage = Prisma.ConversationGetPayload<{
  include: {
    messages: {
      orderBy: { createdAt: "desc" };
      take: 1;
    };
  };
}>;

export async function listConversationsForAdmin(limit = 50, provider?: string) {
  const { getEnrichedMetadata, resolveDisplayName } = await import("@/lib/channel/metadata-utils");
  
  const where = provider ? { provider } : {};
  const conversations = await prisma.conversation.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: {
      customer: true,
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return Promise.all(conversations.map(async (c) => {
    const meta = getEnrichedMetadata(c);
    const resolvedTitle = await resolveDisplayName(
      c.customer?.name || c.title || null,
      c.externalThreadId,
      c.provider
    );

    return {
      ...c,
      resolvedTitle,
      ...meta
    };
  }));
}

export type ConversationWithFullMessages = Prisma.ConversationGetPayload<{
  include: {
    messages: { orderBy: { createdAt: "asc" } };
    customer: true;
  };
}>;

export async function getConversationWithMessages(id: string) {
  const { getEnrichedMetadata, resolveDisplayName } = await import("@/lib/channel/metadata-utils");
  
  const c = await prisma.conversation.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      customer: true,
    },
  });

  if (!c) return null;

  const meta = getEnrichedMetadata(c);
  const resolvedTitle = await resolveDisplayName(
    c.customer?.name || c.title || null,
    c.externalThreadId,
    c.provider
  );

  return {
    ...c,
    resolvedTitle,
    ...meta
  };
}
