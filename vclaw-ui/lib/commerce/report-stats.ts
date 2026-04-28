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
  const channels = await prisma.customer.findMany({
    select: {
      channel: true,
      _count: {
        select: { orders: true }
      },
      orders: {
        where: {
          payments: {
            some: { status: "COMPLETED" }
          }
        },
        select: {
          amount: true
        }
      }
    }
  });

  const stats = channels.reduce((acc, curr) => {
    let name = curr.channel || "Khác";
    if (name.toLowerCase().startsWith("zalo")) name = "Zalo";
    if (!acc[name]) acc[name] = { count: 0, orders: 0, revenue: 0 };
    acc[name].count += 1;
    acc[name].orders += curr._count.orders;
    acc[name].revenue += curr.orders.reduce((sum, o) => sum + o.amount, 0);
    return acc;
  }, {} as Record<string, { count: number; orders: number; revenue: number }>);
  
  return Object.entries(stats).map(([name, data]) => ({
    title: name,
    subtitle: `${data.count} khách hàng • ${data.orders} đơn hàng`,
    badge: `${data.revenue.toLocaleString("vi-VN")} đ`
  }));
}

export async function getTopProducts(limit = 5) {
  const topItems = await prisma.orderItem.groupBy({
    by: ["productId"],
    _count: {
      _all: true
    },
    _sum: {
      quantity: true
    },
    orderBy: {
      _sum: {
        quantity: "desc"
      }
    },
    take: limit
  });

  const products = await prisma.product.findMany({
    where: {
      id: { in: topItems.map(i => i.productId) }
    }
  });

  return topItems.map(item => {
    const p = products.find(x => x.id === item.productId);
    return {
      title: p?.name || "Sản phẩm đã xóa",
      subtitle: `Đã bán: ${item._sum.quantity || 0} sản phẩm`,
      badge: `${(item._count._all || 0)} đơn hàng`
    };
  });
}

export async function getMonthlyRevenueData() {
  const now = new Date();
  const months = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return {
      label: `Tháng ${d.getMonth() + 1}/${d.getFullYear().toString().slice(-2)}`,
      start: d,
      end: new Date(d.getFullYear(), d.getMonth() + 1, 1)
    };
  }).reverse();

  const data = await Promise.all(months.map(async (m) => {
    const agg = await prisma.payment.aggregate({
      where: {
        status: "COMPLETED",
        createdAt: { gte: m.start, lt: m.end }
      },
      _sum: { amount: true }
    });
    return {
      label: m.label,
      value: agg._sum.amount || 0
    };
  }));

  return data;
}

export async function getAutomationEfficiency() {
  const [done, failed, queued] = await Promise.all([
    prisma.automationJob.count({ where: { status: "DONE" } }),
    prisma.automationJob.count({ where: { status: "FAILED" } }),
    prisma.automationJob.count({ where: { status: "QUEUED" } }),
  ]);
  const total = done + failed + queued;
  const rate = total > 0 ? ((done / total) * 100).toFixed(1) : "100";
  
  return [
    { label: "Tỷ lệ thành công", value: `${rate}%`, note: "Tự động hóa" },
    { label: "Đã hoàn tất", value: String(done), note: "Job thành công" },
    { label: "Đang chờ", value: String(queued), note: "Trong hàng đợi" },
    { label: "Thất bại", value: String(failed), note: "Cần kiểm tra" },
  ];
}
