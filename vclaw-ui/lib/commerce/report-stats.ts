import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

/** Labels for overview / report metrics (locale-specific copy). */
export type ReportDataLabels = {
  growth: {
    revenueThisMonth: string;
    ordersThisMonth: string;
    newCustomers: string;
    avgOrderValue: string;
    aovNote: string;
    pctNewThisMonth: string;
    pctNoData: string;
    /** Use placeholders {sign} and {value} (e.g. "+12.3"). */
    pctVsLastMonth: string;
  };
  channels: {
    other: string;
    /** Placeholders: {customers}, {orders} */
    subtitle: string;
  };
  topProducts: {
    deletedProduct: string;
    /** Placeholder {qty} */
    soldSubtitle: string;
    /** Placeholder {count} */
    ordersBadge: string;
    newProductSubtitle: string;
  };
  automation: {
    successRate: string;
    completed: string;
    queued: string;
    failed: string;
    noteAutomation: string;
    noteJobsDone: string;
    noteInQueue: string;
    noteNeedsReview: string;
  };
  operations: {
    activeProducts: string;
    aiJobsDone: string;
    pendingTasks: string;
    totalCustomers: string;
    noteReady: string;
    noteAutomation: string;
    noteNeedsAction: string;
    noteInDirectory: string;
  };
};

export const DEFAULT_VI_REPORT_LABELS: ReportDataLabels = {
  growth: {
    revenueThisMonth: "Doanh thu tháng này",
    ordersThisMonth: "Đơn hàng tháng này",
    newCustomers: "Khách hàng mới",
    avgOrderValue: "Giá trị trung bình đơn",
    aovNote: "AOV tháng này",
    pctNewThisMonth: "Mới trong tháng",
    pctNoData: "Chưa có dữ liệu",
    pctVsLastMonth: "{sign}{value}% so tháng trước",
  },
  channels: {
    other: "Khác",
    subtitle: "{customers} khách hàng • {orders} đơn hàng",
  },
  topProducts: {
    deletedProduct: "Sản phẩm đã xóa",
    soldSubtitle: "Đã bán: {qty} sản phẩm",
    ordersBadge: "{count} đơn hàng",
    newProductSubtitle: "Sản phẩm mới",
  },
  automation: {
    successRate: "Tỷ lệ thành công",
    completed: "Đã hoàn tất",
    queued: "Đang chờ",
    failed: "Thất bại",
    noteAutomation: "Tự động hóa",
    noteJobsDone: "Job thành công",
    noteInQueue: "Trong hàng đợi",
    noteNeedsReview: "Cần kiểm tra",
  },
  operations: {
    activeProducts: "Sản phẩm đang bán",
    aiJobsDone: "Tác vụ AI hoàn tất",
    pendingTasks: "Công việc chờ xử lý",
    totalCustomers: "Tổng số khách hàng",
    noteReady: "Sẵn sàng",
    noteAutomation: "Tự động hóa",
    noteNeedsAction: "Cần xử lý",
    noteInDirectory: "Trong danh bạ",
  },
};

export function mergeReportDataLabels(partial?: Partial<ReportDataLabels>): ReportDataLabels {
  if (!partial) return DEFAULT_VI_REPORT_LABELS;
  return {
    growth: { ...DEFAULT_VI_REPORT_LABELS.growth, ...partial.growth },
    channels: { ...DEFAULT_VI_REPORT_LABELS.channels, ...partial.channels },
    topProducts: { ...DEFAULT_VI_REPORT_LABELS.topProducts, ...partial.topProducts },
    automation: { ...DEFAULT_VI_REPORT_LABELS.automation, ...partial.automation },
    operations: { ...DEFAULT_VI_REPORT_LABELS.operations, ...partial.operations },
  };
}

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

type AdminOverviewSnapshot = {
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
  const [
    orderCount, 
    orderDone, 
    pendingOrders,
    paymentCompleted, 
    revenueAgg, 
    customerCount, 
    productCount, 
    jobCount
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: "DONE" } }),
    prisma.order.count({ where: { status: "PENDING" } }),
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
    pendingOrders,
    paymentCompleted,
    revenue,
    customerCount,
    productCount,
    jobCount,
  };
}

export async function getGrowthStats(
  labels: ReportDataLabels = DEFAULT_VI_REPORT_LABELS,
  numberLocale = "vi-VN",
) {
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

  const lg = labels.growth;
  function pct(curr: number, prev: number): string {
    if (prev === 0) return curr > 0 ? lg.pctNewThisMonth : lg.pctNoData;
    const change = ((curr - prev) / prev) * 100;
    return lg.pctVsLastMonth
      .replace("{sign}", change >= 0 ? "+" : "")
      .replace("{value}", change.toFixed(1));
  }

  const thisRev = revenueThis._sum.amount ?? 0;
  const lastRev = revenueLast._sum.amount ?? 0;
  const aov = ordersThis > 0 ? thisRev / ordersThis : 0;

  return [
    { label: lg.revenueThisMonth, value: `${thisRev.toLocaleString(numberLocale)} đ`, note: pct(thisRev, lastRev) },
    { label: lg.ordersThisMonth, value: String(ordersThis), note: pct(ordersThis, ordersLast) },
    { label: lg.newCustomers, value: String(customersThis), note: pct(customersThis, customersLast) },
    { label: lg.avgOrderValue, value: `${Math.round(aov).toLocaleString(numberLocale)} đ`, note: lg.aovNote },
  ];
}

export async function getOperationsStats(labels: ReportDataLabels = DEFAULT_VI_REPORT_LABELS) {
  const activeProducts = await prisma.product.count({ where: { status: "ACTIVE" } });
  const automationJobs = await prisma.automationJob.count({ where: { status: "DONE" } });
  const pendingTasks = await prisma.task.count({ where: { status: "NEW" } });
  const totalCustomers = await prisma.customer.count();
  const op = labels.operations;

  return [
    { label: op.activeProducts, value: String(activeProducts), note: op.noteReady },
    { label: op.aiJobsDone, value: String(automationJobs), note: op.noteAutomation },
    { label: op.pendingTasks, value: String(pendingTasks), note: op.noteNeedsAction },
    { label: op.totalCustomers, value: String(totalCustomers), note: op.noteInDirectory },
  ];
}

export async function getChannelReport(
  labels: ReportDataLabels = DEFAULT_VI_REPORT_LABELS,
  numberLocale = "vi-VN",
) {
  const rawStats = await prisma.$queryRaw<
    Array<{
      channel: string | null;
      customerCount: number | bigint;
      orderCount: number | bigint;
      revenue: number | null;
    }>
  >`
    SELECT 
      c.channel,
      COUNT(DISTINCT c.id) as customerCount,
      COUNT(o.id) as orderCount,
      COALESCE(SUM(o.amount), 0) as revenue
    FROM "Customer" c
    LEFT JOIN "Order" o ON c.id = o."customerId" 
      AND EXISTS (
        SELECT 1 
        FROM "Payment" p 
        WHERE p."orderId" = o.id 
          AND p.status = 'COMPLETED'
      )
    GROUP BY c.channel
  `;

  const stats = rawStats.reduce((acc, curr) => {
    let name = curr.channel || labels.channels.other;
    if (name.toLowerCase().startsWith("zalo")) name = "Zalo";
    
    if (!acc[name]) acc[name] = { count: 0, orders: 0, revenue: 0 };
    acc[name].count += Number(curr.customerCount);
    acc[name].orders += Number(curr.orderCount);
    acc[name].revenue += Number(curr.revenue);
    return acc;
  }, {} as Record<string, { count: number; orders: number; revenue: number }>);

  return Object.entries(stats).map(([name, data]) => ({
    title: name,
    subtitle: labels.channels.subtitle
      .replace("{customers}", String(data.count))
      .replace("{orders}", String(data.orders)),
    badge: `${data.revenue.toLocaleString(numberLocale)} đ`,
  }));
}

export async function getTopProducts(
  limit = 5,
  labels: ReportDataLabels = DEFAULT_VI_REPORT_LABELS,
  numberLocale = "vi-VN",
) {
  const topItems = await prisma.orderItem.groupBy({
    by: ["productId"],
    _count: { _all: true },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: limit
  });

  if (topItems.length > 0) {
    const products = await prisma.product.findMany({
      where: { id: { in: topItems.map(i => i.productId) } }
    });

    const tp = labels.topProducts;
    return topItems.map(item => {
      const p = products.find(x => x.id === item.productId);
      return {
        title: p?.name || tp.deletedProduct,
        subtitle: tp.soldSubtitle.replace("{qty}", String(item._sum.quantity || 0)),
        badge: tp.ordersBadge.replace("{count}", String(item._count._all || 0)),
      };
    });
  }

  // Fallback: Lấy các sản phẩm mới cập nhật nếu chưa có dữ liệu bán hàng
  const latestProducts = await prisma.product.findMany({
    where: { status: "ACTIVE" },
    take: limit,
    orderBy: { updatedAt: "desc" }
  });

  const tp = labels.topProducts;
  return latestProducts.map(p => ({
    title: p.name,
    subtitle: tp.newProductSubtitle,
    badge: `${p.price.toLocaleString(numberLocale)} đ`
  }));
}

export async function getRecentRevenueData() {
  const now = new Date();
  // Căn chỉnh về mốc 0h của 3 ngày trước
  const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 0, 0, 0);
  
  // Tạo 18 khung giờ (3 ngày * 6 khung/ngày)
  const slots = Array.from({ length: 18 }).map((_, i) => {
    const start = new Date(startDate.getTime() + i * 4 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 4 * 60 * 60 * 1000);
    
    // Format label: "29/4 0-4h"
    const day = start.getDate();
    const month = start.getMonth() + 1;
    const label = `${day}/${month} ${start.getHours()}-${end.getHours()}h`;
    
    return { label, start, end };
  });

  const data = await Promise.all(slots.map(async (s) => {
    const agg = await prisma.payment.aggregate({
      where: {
        status: "COMPLETED",
        createdAt: { gte: s.start, lt: s.end }
      },
      _sum: { amount: true }
    });
    return {
      label: s.label,
      value: agg._sum.amount || 0
    };
  }));

  return data;
}

export async function getAutomationEfficiency(labels: ReportDataLabels = DEFAULT_VI_REPORT_LABELS) {
  const [done, failed, queued] = await Promise.all([
    prisma.automationJob.count({ where: { status: "DONE" } }),
    prisma.automationJob.count({ where: { status: "FAILED" } }),
    prisma.automationJob.count({ where: { status: "QUEUED" } }),
  ]);
  const total = done + failed + queued;
  const rate = total > 0 ? ((done / total) * 100).toFixed(1) : "100";
  const au = labels.automation;

  return [
    { label: au.successRate, value: `${rate}%`, note: au.noteAutomation },
    { label: au.completed, value: String(done), note: au.noteJobsDone },
    { label: au.queued, value: String(queued), note: au.noteInQueue },
    { label: au.failed, value: String(failed), note: au.noteNeedsReview },
  ];
}

/** 
 * Lấy dữ liệu tăng trưởng khách hàng trong 7 ngày qua
 */
export async function getCustomerGrowthData() {
  const now = new Date();
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i));
    const start = new Date(d.setHours(0, 0, 0, 0));
    const end = new Date(d.setHours(23, 59, 59, 999));
    return { label: `${d.getDate()}/${d.getMonth() + 1}`, start, end };
  });

  return Promise.all(days.map(async (d) => {
    const count = await prisma.customer.count({
      where: { createdAt: { gte: d.start, lte: d.end } }
    });
    return { label: d.label, value: count };
  }));
}

/**
 * Tổng hợp toàn bộ dữ liệu báo cáo cho API / MCP Tools
 */
export async function getBusinessReportStats() {
  const apiLabels = DEFAULT_VI_REPORT_LABELS;
  const [
    snapshot,
    growth,
    operations,
    channels,
    revenue,
    orderStatus,
    customerGrowth,
    topProducts
  ] = await Promise.all([
    getCommerceReportSnapshot(),
    getGrowthStats(apiLabels),
    getOperationsStats(apiLabels),
    getChannelReport(apiLabels),
    getRecentRevenueData(),
    getOrderStatusBreakdown(),
    getCustomerGrowthData(),
    getTopProducts(10, apiLabels)
  ]);

  return {
    timestamp: new Date().toISOString(),
    summary: {
      totalRevenue: snapshot.revenue,
      totalOrders: snapshot.orderCount,
      totalCustomers: snapshot.customerCount,
      activeProducts: snapshot.productCount,
    },
    metrics: {
      growth,
      operations,
      channels,
    },
    charts: {
      revenueTimeline: revenue,
      orderStatusDistribution: orderStatus,
      customerGrowthTimeline: customerGrowth,
    },
    topProducts
  };
}

