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
import { getAdminPath } from "@/lib/admin-content";
import { getAdminLocaleContent } from "@/lib/admin-runtime";
import {
  getCommerceReportSnapshot,
  getOrderStatusBreakdown,
  getPaymentStatusBreakdown,
  StatusBreakdownItem,
} from "@/lib/report-stats";
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

  const [snapshot, products, orderBreakdown, paymentBreakdown] = await Promise.all([
    getCommerceReportSnapshot(),
    getProducts(),
    getOrderStatusBreakdown(),
    getPaymentStatusBreakdown(),
  ]);

  const activeSkus = products
    .filter((p: Product) => p.status === "ACTIVE")
    .map((p: Product) => ({ name: p.name, price: p.price }));

  const orderStatItems = orderBreakdown.map((o: StatusBreakdownItem) => ({
    label: o.status,
    value: String(o.count),
    note: "Order",
  }));
  const paymentStatItems = paymentBreakdown.map((p: StatusBreakdownItem) => ({
    label: p.status,
    value: String(p.count),
    note: "Payment",
  }));

  const prd = content.reportPrdNotice;

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

      {content.reportBreakdown ? (
        <section className="space-y-8">
          <div className="space-y-3">
            <h2 className="text-xl font-bold tracking-tight text-[color:var(--foreground-strong)]">
              {content.reportBreakdown.ordersTitle}
            </h2>
            <p className="text-sm text-[color:var(--muted)]">
              {content.reportBreakdown.ordersDescription}
            </p>
            <StatsGrid items={orderStatItems} />
          </div>
          <div className="space-y-3">
            <h2 className="text-xl font-bold tracking-tight text-[color:var(--foreground-strong)]">
              {content.reportBreakdown.paymentsTitle}
            </h2>
            <p className="text-sm text-[color:var(--muted)]">
              {content.reportBreakdown.paymentsDescription}
            </p>
            <StatsGrid items={paymentStatItems} />
          </div>
        </section>
      ) : null}

      {prd ? (
        <section className="mt-10 space-y-6 rounded-2xl border border-dashed border-[color:var(--line-strong)] bg-[color:var(--surface-soft)] p-6">
          <p className="text-sm leading-relaxed text-[color:var(--muted)]">{prd.disclaimer}</p>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-[color:var(--foreground-strong)]">
              {prd.performanceTitle}
            </h2>
            {content.reportStats.revenue ? (
              <StatsGrid items={content.reportStats.revenue} />
            ) : null}
          </div>

          <SplitHero
            left={
              content.reportSections?.channels ? (
                <ListCard
                  title={content.reportSections.channels.title}
                  description={content.reportSections.channels.description}
                  items={content.reportSections.channels.items}
                />
              ) : null
            }
            right={
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[color:var(--foreground-strong)] px-1">
                    {prd.operationsSubtitle}
                  </h3>
                  {content.reportStats.operations ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {content.reportStats.operations.map((item: any) => (
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
                  ) : null}
                </div>

                {content.reportSections?.shipping ? (
                  <ListCard
                    title={content.reportSections.shipping.title}
                    description={content.reportSections.shipping.description}
                    items={content.reportSections.shipping.items}
                  />
                ) : null}
              </div>
            }
          />

          <div className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight text-[color:var(--foreground-strong)]">
              {prd.growthTitle}
            </h2>
            {content.reportStats.growth ? <StatsGrid items={content.reportStats.growth} /> : null}
          </div>
        </section>
      ) : null}

      {content.shopeeExport ? (
        <ShopeeSkuExport products={activeSkus} messages={content.shopeeExport} />
      ) : null}

      <WorkflowCard
        title={content.workflow.title}
        description={shell.workflowDescription}
        steps={content.workflow.steps}
      />
    </AdminShell>
  );
}
