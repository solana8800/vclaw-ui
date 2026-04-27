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

export async function listConversationsForAdmin(limit = 50, provider?: string): Promise<ConversationWithLastMessage[]> {
  const where = provider ? { provider } : {};
  return prisma.conversation.findMany({
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
}

export type ConversationWithFullMessages = Prisma.ConversationGetPayload<{
  include: {
    messages: { orderBy: { createdAt: "asc" } };
    customer: true;
  };
}>;

export async function getConversationWithMessages(id: string): Promise<ConversationWithFullMessages | null> {
  return prisma.conversation.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      customer: true,
    },
  });
}
