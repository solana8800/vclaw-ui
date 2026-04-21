import { prisma } from "@/lib/prisma";

export async function listConversationsForAdmin(limit = 50) {
  return prisma.conversation.findMany({
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
}

export async function getConversationWithMessages(id: string) {
  return prisma.conversation.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      customer: true,
    },
  });
}
