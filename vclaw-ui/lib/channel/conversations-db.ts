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

export async function listConversationsForAdmin(page = 1, pageSize = 50, provider?: string) {
  const { getEnrichedMetadata, resolveDisplayName } = await import("@/lib/channel/metadata-utils");
  
  const skip = (page - 1) * pageSize;
  const where = provider ? { provider } : {};
  
  const [conversations, total] = await Promise.all([
    prisma.conversation.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take: pageSize,
      include: {
        customer: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
    prisma.conversation.count({ where }),
  ]);

  const data = await Promise.all(conversations.map(async (c) => {
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

  return {
    data,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
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
