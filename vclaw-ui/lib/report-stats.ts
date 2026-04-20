import { prisma } from "@/lib/prisma";

/** Cửa sổ “hôm nay” theo UTC (ghi chú trong UI / guide). */
function utcDayBounds() {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0),
  );
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0),
  );
  return { start, end };
}

export type AdminOverviewSnapshot = {
  pendingPayments: number;
  openOrders: number;
  bookingsToday: number;
  tasksOpen: number;
};

export async function getAdminOverviewSnapshot(): Promise<AdminOverviewSnapshot> {
  const { start, end } = utcDayBounds();
  const [pendingPayments, openOrders, bookingsToday, tasksOpen] = await Promise.all([
    prisma.payment.count({ where: { status: "PENDING" } }),
    prisma.order.count({ where: { status: { not: "DONE" } } }),
    prisma.booking.count({
      where: {
        startTime: { gte: start, lt: end },
        status: { not: "CANCELLED" },
      },
    }),
    prisma.task.count({ where: { status: "NEW" } }),
  ]);
  return { pendingPayments, openOrders, bookingsToday, tasksOpen };
}

export type RecentOrderActivity = {
  id: string;
  orderNumber: string;
  customerName: string;
  status: string;
  amount: number;
  updatedAt: string;
};

export async function getRecentOrdersForActivity(limit = 5): Promise<RecentOrderActivity[]> {
  const rows = await prisma.order.findMany({
    take: limit,
    orderBy: { updatedAt: "desc" },
    include: { customer: { select: { name: true } } },
  });
  return rows.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customer.name,
    status: o.status,
    amount: o.amount,
    updatedAt: o.updatedAt.toISOString(),
  }));
}

export async function getOverviewOpenOrdersList(limit = 5) {
  return prisma.order.findMany({
    where: { status: { not: "DONE" } },
    take: limit,
    orderBy: { updatedAt: "desc" },
    include: { customer: { select: { name: true } } },
  });
}

export async function getOverviewPendingPaymentsList(limit = 5) {
  return prisma.payment.findMany({
    where: { status: "PENDING" },
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { order: { select: { orderNumber: true } } },
  });
}

export async function getOrderStatusBreakdown() {
  const rows = await prisma.order.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const map = new Map(rows.map((r) => [r.status, r._count._all]));
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([status, count]) => ({ status, count }));
}

export async function getPaymentStatusBreakdown() {
  const rows = await prisma.payment.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const map = new Map(rows.map((r) => [r.status, r._count._all]));
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([status, count]) => ({ status, count }));
}

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
