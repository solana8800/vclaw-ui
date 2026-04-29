import { setRequestLocale } from "next-intl/server";
import {
  AdminShell,
  ListCard,
  StatsGrid,
  WorkflowCard,
  SplitHero,
} from "@/components/admin/admin-shell";
import { ReportsLiveStats } from "@/components/admin/reports-live-stats";
import { ShopeeSkuExport } from "@/components/admin/shopee-sku-export";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { CustomerGrowthChart } from "@/components/admin/customer-growth-chart";
import { StatusDistributionChart } from "@/components/admin/status-distribution-chart";
import { getAdminPath } from "@/lib/admin/content";
import { getAdminLocaleContent } from "@/lib/admin/runtime";
import {
  getCommerceReportSnapshot,
  getOrderStatusBreakdown,
  getPaymentStatusBreakdown,
  getGrowthStats,
  getOperationsStats,
  getChannelReport,
  getTopProducts,
  getAutomationEfficiency,
  getRecentRevenueData,
  getCustomerGrowthData,
  StatusBreakdownItem,
} from "@/lib/commerce/report-stats";
import { getProducts } from "@/lib/actions/product-actions";
import type { AppLocale } from "@/i18n/routing";
import type { Product } from "@prisma/client";

type AdminReportsPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AdminReportsPage({ params }: AdminReportsPageProps) {
  const { locale } = (await params) as { locale: AppLocale };
  setRequestLocale(locale);

  const { admin, navigation, shell } = await getAdminLocaleContent(locale);
  const content = admin.reports;

  if (!content || !content.reportStats) {
    return <div>Dữ liệu báo cáo không khả dụng hoặc đang được cập nhật.</div>;
  }

  const [
    snapshot, 
    products, 
    orderBreakdown, 
    paymentBreakdown, 
    growthStats, 
    operationsStats, 
    channelStats, 
    topProducts, 
    autoEfficiency, 
    monthlyRevenue,
    customerGrowth
  ] = await Promise.all([
    getCommerceReportSnapshot(),
    getProducts(),
    getOrderStatusBreakdown(),
    getPaymentStatusBreakdown(),
    getGrowthStats(),
    getOperationsStats(),
    getChannelReport(),
    getTopProducts(5),
    getAutomationEfficiency(),
    getRecentRevenueData(),
    getCustomerGrowthData(),
  ]);

  const activeProducts = products.filter((p: Product) => p.status === "ACTIVE");

  return (
    <AdminShell
      navigation={navigation}
      currentPath={getAdminPath(locale, "/admin/reports")}
      title={content.title}
      description={content.description}
      badge={shell.badge}
      sidebarTitle={shell.sidebarTitle}
      sidebarDescription={shell.sidebarDescription}
    >
      {content.liveStats ? (
        <ReportsLiveStats snapshot={snapshot} messages={content.liveStats} />
      ) : null}

      <section className="mt-10 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueChart 
            data={monthlyRevenue} 
            title="Biểu đồ doanh thu" 
            description="Doanh thu thực tế 72 giờ gần nhất (khung 4h)." 
          />
        </div>
        <div>
          <StatusDistributionChart
            data={orderBreakdown}
            title="Trạng thái đơn hàng"
            description="Phân bổ đơn hàng theo trạng thái hệ thống."
          />
        </div>
      </section>

      <section className="mt-10 space-y-8">
        <div className="space-y-4">
          <div className="flex items-end justify-between">
            <h2 className="text-xl font-bold tracking-tight text-[color:var(--foreground-strong)]">
              Hiệu quả kinh doanh & Tăng trưởng
            </h2>
            <a 
              href="/api/admin/reports/stats" 
              target="_blank"
              className="text-xs font-medium text-[color:var(--brand-strong)] hover:underline flex items-center gap-1"
            >
              Xem API báo cáo (JSON)
            </a>
          </div>
          <StatsGrid items={growthStats} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <CustomerGrowthChart 
              data={customerGrowth} 
              title="Tăng trưởng khách hàng" 
              description="Số lượng khách hàng mới đăng ký trong 7 ngày qua." 
            />

            <ListCard
              title="Kênh tiếp cận khách hàng"
              description="Thống kê doanh thu và lượng khách theo nền tảng."
              items={channelStats}
            />
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-[color:var(--foreground-strong)] px-1">
                Chỉ số vận hành hệ thống
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {operationsStats.map((item: any) => (
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

            {content.shopeeExport ? (
              <ShopeeSkuExport products={activeProducts} messages={content.shopeeExport} />
            ) : null}
          </div>

          <div className="space-y-6">
            <ListCard
              title="Sản phẩm nổi bật"
              description="Dựa trên số lượng đơn hàng đã hoàn tất hoặc sản phẩm mới."
              items={topProducts}
            />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-[color:var(--foreground-strong)] px-1">
                Hiệu suất Tự động hóa AI
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
              title="Phương thức thanh toán"
              description="Thống kê tỷ lệ thanh toán theo trạng thái đối soát."
            />
          </div>
        </div>
      </section>

      <WorkflowCard
        title={content.workflow.title}
        description={shell.workflowDescription}
        steps={content.workflow.steps}
      />
    </AdminShell>
  );
}
