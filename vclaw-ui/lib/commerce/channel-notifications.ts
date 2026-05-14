import { prisma } from "@/lib/db/prisma";

export async function getChannelNotifications() {
  const notifications = await prisma.channelNotification.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const orderNumbers = notifications
    .map((n) => n.orderNumber)
    .filter((n): n is string => Boolean(n));

  if (orderNumbers.length === 0) {
    return notifications.map((n) => ({ ...n, order: null, totalPaidForOrder: 0 }));
  }

  // Lấy thông tin đơn hàng để xem tổng tiền cần thanh toán
  const orders = await prisma.order.findMany({
    where: { orderNumber: { in: orderNumbers } },
    select: { orderNumber: true, amount: true, status: true },
  });

  // Lấy TẤT CẢ các giao dịch liên quan đến các mã đơn này để tính tổng đã thanh toán
  const allRelatedTxs = await prisma.channelNotification.findMany({
    where: { orderNumber: { in: orderNumbers }, amount: { not: null } },
    select: { orderNumber: true, amount: true },
  });

  const orderMap = new Map(orders.map((o) => [o.orderNumber, o]));
  const totalPaidMap = new Map<string, number>();

  allRelatedTxs.forEach((tx) => {
    const current = totalPaidMap.get(tx.orderNumber!) || 0;
    totalPaidMap.set(tx.orderNumber!, current + (tx.amount || 0));
  });

  return notifications.map((n) => {
    const order = n.orderNumber ? orderMap.get(n.orderNumber) : null;
    const totalPaidForOrder = n.orderNumber ? totalPaidMap.get(n.orderNumber) || 0 : 0;
    return {
      ...n,
      order,
      totalPaidForOrder,
    };
  });
}
