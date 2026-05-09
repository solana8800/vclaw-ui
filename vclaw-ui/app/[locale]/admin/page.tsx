import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import {
  AdminShell,
  ListCard,
  StatsGrid,
  SplitHero,
  WorkflowCard,
} from "@/components/admin/admin-shell";
import { OperatorStartBanner } from "@/components/admin/operator-start-banner";
import { TaskInboxWidget } from "@/components/admin/dashboard-widgets";
import { RecentActivityCard } from "@/components/admin/recent-activity-card";
import { ReportsLiveStats } from "@/components/admin/reports-live-stats";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { CustomerGrowthChart } from "@/components/admin/customer-growth-chart";
import { StatusDistributionChart } from "@/components/admin/status-distribution-chart";
import { ShopeeSkuExport } from "@/components/admin/shopee-sku-export";
import { normalizeInboxTaskType } from "@/lib/commerce/inbox-task-type";
import { getAdminPath } from "@/lib/admin/content";
import { getAdminLocaleContent } from "@/lib/admin/runtime";
import {
  getAdminOverviewSnapshot,
  getOverviewOpenOrdersList,
  getOverviewPendingPaymentsList,
  getRecentOrdersForActivity,
  getCommerceReportSnapshot,
  getOrderStatusBreakdown,
  getPaymentStatusBreakdown,
  getGrowthStats,
  getChannelReport,
  getTopProducts,
  getAutomationEfficiency,
  getRecentRevenueData,
  getCustomerGrowthData,
  type OverviewOrderRow,
  type OverviewPaymentRow,
} from "@/lib/commerce/report-stats";
import { getTasks } from "@/lib/commerce/tasks";
import { getProducts } from "@/lib/actions/product-actions";
import type { AppLocale } from "@/i18n/routing";
import type { Task, Product } from "@prisma/client";

type AdminOverviewPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function AdminOverviewPage({
  params,
  searchParams,
}: AdminOverviewPageProps) {
  const { locale } = (await params) as { locale: AppLocale };
  await searchParams;
  setRequestLocale(locale);
  const { admin, navigation, shell, guideHref, guideLabel } =
    await getAdminLocaleContent(locale);
  const content = admin.overview;
  const reportsContent = admin.reports;

  const moneyLocale = locale === "en" ? "en-US" : "vi-VN";
  const statusMap = admin.common?.statuses ?? {};
  const getStatusLabel = (s: string) => statusMap[s] || s;

  const [
    dbTasks,
    overviewSnap,
    recentOrders,
    openOrderRows,
    pendingPayRows,
    reportSnapshot,
    products,
    orderBreakdown,
    paymentBreakdown,
    growthStats,
    channelStats,
    topProducts,
    autoEfficiency,
    monthlyRevenue,
    customerGrowth,
  ] = await Promise.all([
    getTasks(),
    getAdminOverviewSnapshot(),
    getRecentOrdersForActivity(5),
    getOverviewOpenOrdersList(5),
    getOverviewPendingPaymentsList(5),
    getCommerceReportSnapshot(),
    getProducts(),
    getOrderStatusBreakdown(),
    getPaymentStatusBreakdown(),
    getGrowthStats(),
    getChannelReport(),
    getTopProducts(5),
    getAutomationEfficiency(),
    getRecentRevenueData(),
    getCustomerGrowthData(),
  ]);

  const live = content.dashboardStats;
  const overviewStatsItems = live
    ? [
        {
          label: live.items.pendingPayments.label,
          value: String(overviewSnap.pendingPayments),
          note: live.items.pendingPayments.note,
        },
        {
          label: live.items.openOrders.label,
          value: String(overviewSnap.openOrders),
          note: live.items.openOrders.note,
        },
        {
          label: live.items.bookingsToday.label,
          value: String(overviewSnap.bookingsToday),
          note: live.items.bookingsToday.note,
        },
        {
          label: live.items.tasksOpen.label,
          value: String(overviewSnap.tasksOpen),
          note: live.items.tasksOpen.note,
        },
      ]
    : [];

  const openOrderItems = openOrderRows.map((o: OverviewOrderRow) => ({
    title: `${o.orderNumber} · ${o.customer.name}`,
    subtitle: `${getStatusLabel(o.status)} · ${o.amount.toLocaleString(moneyLocale)} đ`,
  }));
  const pendingPayItems = pendingPayRows.map((p: OverviewPaymentRow) => ({
    title: `${p.order.orderNumber}`,
    subtitle: `${p.method} · ${p.amount.toLocaleString(moneyLocale)} đ`,
    badge: getStatusLabel(p.status),
  }));

  const activeProducts = products.filter((p: Product) => p.status === "ACTIVE");

  return (
    <AdminShell
      navigation={navigation}
      currentPath={getAdminPath(locale, "/admin")}
      title={content.title}
      description={content.description}
      badge={shell.badge}
      sidebarTitle={shell.sidebarTitle}
      sidebarDescription={shell.sidebarDescription}
      guideHref={guideHref}
      guideLabel={guideLabel}
    >
      {/* KPI nhanh */}
      {live && overviewStatsItems.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold tracking-tight text-[color:var(--foreground-strong)]">
            {live.sectionTitle}
          </h2>
          <StatsGrid items={overviewStatsItems} />
        </section>
      )}

      {/* Live revenue stats từ reports */}
      {reportsContent?.liveStats && (
        <ReportsLiveStats
          snapshot={reportSnapshot}
          messages={reportsContent.liveStats}
        />
      )}

      {/* Biểu đồ doanh thu + phân bổ đơn hàng */}
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueChart
            data={monthlyRevenue}
            title={content.charts?.revenueTitle || "Biểu đồ doanh thu"}
            description={content.charts?.revenueDescription || "Doanh thu thực tế 72 giờ gần nhất (khung 4h)."}
          />
        </div>
        <div>
          <StatusDistributionChart
            data={orderBreakdown}
            title={content.charts?.orderStatusTitle || "Trạng thái đơn hàng"}
            description={content.charts?.orderStatusDescription || "Phân bổ đơn hàng theo trạng thái hệ thống."}
          />
        </div>
      </section>

      {/* Task inbox + hoạt động gần đây */}
      {content.taskInbox && content.recentActivity && (
        <SplitHero
          left={
            <TaskInboxWidget
              title={content.taskInbox.title}
              tasks={dbTasks.map((t: Task) => ({
                id: t.id,
                type: normalizeInboxTaskType(t.type),
                title: t.title,
                subtitle: t.subtitle || "",
                amount: t.amount || undefined,
                timeAgo: t.timeAgo || "—",
                isUrgent: t.isUrgent,
              }))}
            />
          }
          right={
            <RecentActivityCard
              title={content.recentActivity.title}
              empty={content.recentActivity.empty}
              orders={recentOrders}
              locale={locale}
            />
          }
        />
      )}

      {/* Tăng trưởng */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight text-[color:var(--foreground-strong)]">
          {content.performance?.sectionTitle || "Hiệu quả kinh doanh & Tăng trưởng"}
        </h2>
        <StatsGrid items={growthStats} />
      </section>

      {/* Charts + lists chi tiết */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <CustomerGrowthChart
            data={customerGrowth}
            title={content.charts?.customerGrowthTitle || "Tăng trưởng khách hàng"}
            description={content.charts?.customerGrowthDescription || "Số lượng khách hàng mới trong 7 ngày qua."}
          />
          <ListCard
            title={content.charts?.channelsTitle || "Kênh tiếp cận khách hàng"}
            description={content.charts?.channelsDescription || "Thống kê doanh thu và lượng khách theo nền tảng."}
            items={channelStats}
          />

          {reportsContent?.shopeeExport && (
            <ShopeeSkuExport
              products={activeProducts}
              messages={reportsContent.shopeeExport}
            />
          )}
        </div>

        <div className="space-y-6">
          <ListCard
            title={content.charts?.topProductsTitle || "Sản phẩm nổi bật"}
            description={content.charts?.topProductsDescription || "Dựa trên số lượng đơn hàng đã hoàn tất."}
            items={topProducts}
          />
          <div className="space-y-3">
            <h3 className="px-1 text-lg font-semibold text-[color:var(--foreground-strong)]">
              {content.performance?.efficiencyTitle || "Hiệu suất Tự động hóa AI"}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {autoEfficiency.map((item: any) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-glass)] p-4 shadow-sm backdrop-blur"
                >
                  <div className="text-sm text-[color:var(--muted)]">{item.label}</div>
                  <div className="mt-1 text-2xl font-bold text-[color:var(--foreground-strong)]">
                    {item.value}
                  </div>
                  <div className="mt-1 text-xs text-[color:var(--brand-strong)]">{item.note}</div>
                </div>
              ))}
            </div>
          </div>
          <StatusDistributionChart
            data={paymentBreakdown}
            title={content.charts?.paymentMethodTitle || "Phương thức thanh toán"}
            description={content.charts?.paymentMethodDescription || "Thống kê tỷ lệ thanh toán theo trạng thái đối soát."}
          />
        </div>
      </section>

      {/* Đơn hàng mở + thanh toán chờ */}
      {content.dbLists && process.env.NEXT_PUBLIC_IS_DESKTOP !== "true" && (
        <section className="grid gap-6 lg:grid-cols-2">
          <ListCard
            title={content.dbLists.openOrdersTitle}
            description={content.dbLists.openOrdersDescription}
            items={openOrderItems}
          />
          <ListCard
            title={content.dbLists.pendingPaymentsTitle}
            description={content.dbLists.pendingPaymentsDescription}
            items={pendingPayItems}
          />
        </section>
      )}

      {/* Hướng dẫn khởi tạo (chỉ hiển thị khi mới dùng) */}
      {content.operatorStart && process.env.NEXT_PUBLIC_IS_DESKTOP !== "true" && (
        <OperatorStartBanner
          title={content.operatorStart.title}
          subtitle={content.operatorStart.subtitle}
          stepWord={content.operatorStart.stepWord}
          openWord={content.operatorStart.openWord}
          guideHref={getAdminPath(locale, "/admin/guide")}
          guideLabel={content.operatorStart.guideCta}
          steps={content.operatorStart.steps.map((s) => ({
            title: s.title,
            description: s.description,
            href: getAdminPath(locale, s.path),
          }))}
        />
      )}
    </AdminShell>
  );
}
