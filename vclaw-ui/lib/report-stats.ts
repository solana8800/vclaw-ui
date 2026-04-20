import { prisma } from "@/lib/prisma";

export async function getCommerceReportSnapshot() {
  const [orderCount, orderDone, paymentCompleted, revenueAgg, customerCount, productCount] =
    await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: "DONE" } }),
      prisma.payment.count({ where: { status: "COMPLETED" } }),
      prisma.payment.aggregate({
        where: { status: "COMPLETED" },
        _sum: { amount: true },
      }),
      prisma.customer.count(),
      prisma.product.count({ where: { status: "ACTIVE" } }),
    ]);

  const revenue = revenueAgg._sum.amount ?? 0;

  return {
    orderCount,
    orderDone,
    paymentCompleted,
    revenue,
    customerCount,
    productCount,
  };
}
