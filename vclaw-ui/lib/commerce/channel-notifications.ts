import { prisma } from "@/lib/db/prisma";

export async function getChannelNotifications() {
  return prisma.channelNotification.findMany({
    orderBy: { createdAt: "desc" },
    take: 100, // Lấy tối đa 100 giao dịch/tin nhắn gần nhất
  });
}
