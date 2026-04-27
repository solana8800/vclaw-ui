import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

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

export type OverviewOrderRow = Prisma.OrderGetPayload<{
  include: { customer: { select: { name: true } } };
}>;

export async function getOverviewOpenOrdersList(limit = 5): Promise<OverviewOrderRow[]> {
  return prisma.order.findMany({
    where: { status: { not: "DONE" } },
    take: limit,
    orderBy: { updatedAt: "desc" },
    include: { customer: { select: { name: true } } },
  });
}

export type OverviewPaymentRow = Prisma.PaymentGetPayload<{
  include: { order: { select: { orderNumber: true } } };
}>;

export async function getOverviewPendingPaymentsList(limit = 5): Promise<OverviewPaymentRow[]> {
  return prisma.payment.findMany({
    where: { status: "PENDING" },
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { order: { select: { orderNumber: true } } },
  });
}

export type StatusBreakdownItem = {
  status: string;
  count: number;
};

export async function getOrderStatusBreakdown(): Promise<StatusBreakdownItem[]> {
  const rows = await prisma.order.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const map = new Map(rows.map((r) => [r.status, r._count._all]));
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([status, count]) => ({ status, count }));
}

export async function getPaymentStatusBreakdown(): Promise<StatusBreakdownItem[]> {
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
  const [orderCount, orderDone, paymentCompleted, revenueAgg, customerCount, productCount, jobCount] =
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
      prisma.automationJob.count({ where: { status: "DONE" } }),
    ]);

  const revenue = revenueAgg._sum.amount ?? 0;

  return {
    orderCount,
    orderDone,
    paymentCompleted,
    revenue,
    customerCount,
    productCount,
    jobCount,
  };
}

export async function getGrowthStats() {
  // So sánh tháng hiện tại và tháng trước để tính % thực tế
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = thisMonthStart;

  const [
    revenueThis, revenueLast,
    ordersThis, ordersLast,
    customersThis, customersLast,
  ] = await Promise.all([
    prisma.payment.aggregate({ where: { status: "COMPLETED", createdAt: { gte: thisMonthStart } }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { status: "COMPLETED", createdAt: { gte: lastMonthStart, lt: lastMonthEnd } }, _sum: { amount: true } }),
    prisma.order.count({ where: { createdAt: { gte: thisMonthStart } } }),
    prisma.order.count({ where: { createdAt: { gte: lastMonthStart, lt: lastMonthEnd } } }),
    prisma.customer.count({ where: { createdAt: { gte: thisMonthStart } } }),
    prisma.customer.count({ where: { createdAt: { gte: lastMonthStart, lt: lastMonthEnd } } }),
  ]);

  function pct(curr: number, prev: number): string {
    if (prev === 0) return curr > 0 ? "Mới trong tháng" : "Chưa có dữ liệu";
    const change = ((curr - prev) / prev) * 100;
    return `${change >= 0 ? "+" : ""}${change.toFixed(1)}% so tháng trước`;
  }

  const thisRev = revenueThis._sum.amount ?? 0;
  const lastRev = revenueLast._sum.amount ?? 0;

  return [
    { label: "Doanh thu tháng này", value: `${thisRev.toLocaleString("vi-VN")} đ`, note: pct(thisRev, lastRev) },
    { label: "Đơn hàng tháng này", value: String(ordersThis), note: pct(ordersThis, ordersLast) },
    { label: "Khách hàng mới tháng này", value: String(customersThis), note: pct(customersThis, customersLast) },
  ];
}

export async function getOperationsStats() {
  const activeProducts = await prisma.product.count({ where: { status: "ACTIVE" } });
  const automationJobs = await prisma.automationJob.count({ where: { status: "DONE" } });
  const pendingTasks = await prisma.task.count({ where: { status: "NEW" } });
  
  return [
    { label: "Sản phẩm đang bán", value: String(activeProducts), note: "Sẵn sàng" },
    { label: "Tác vụ AI hoàn tất", value: String(automationJobs), note: "Tự động hóa" },
    { label: "Công việc chờ xử lý", value: String(pendingTasks), note: "Cần xử lý" },
  ];
}

export async function getChannelReport() {
  const channels = await prisma.customer.groupBy({
    by: ["channel"],
    _count: { _all: true },
  });
  
  return channels.map(c => ({
    title: c.channel || "Unknown",
    subtitle: `${c._count._all} khách hàng`,
  }));
}
