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
import { getCommerceReportSnapshot } from "@/lib/report-stats";
import { getProducts } from "@/lib/actions/product-actions";
import type { AppLocale } from "@/i18n/routing";

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

  const [snapshot, products] = await Promise.all([
    getCommerceReportSnapshot(),
    getProducts(),
  ]);

  const activeSkus = products
    .filter((p) => p.status === "ACTIVE")
    .map((p) => ({ name: p.name, price: p.price }));

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

      <section className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight text-[color:var(--foreground-strong)]">
          Hiệu suất kinh doanh (mẫu PRD)
        </h2>
        {content.reportStats.revenue && (
          <StatsGrid items={content.reportStats.revenue} />
        )}
      </section>

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
                Hiệu quả vận hành trợ lý
              </h3>
              {content.reportStats.operations && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {content.reportStats.operations.map((item) => (
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
              )}
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

      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight text-[color:var(--foreground-strong)]">
          Tác động từ Trợ lý Tăng trưởng AI
        </h2>
        {content.reportStats.growth && <StatsGrid items={content.reportStats.growth} />}
      </section>

      {content.shopeeExport ? (
        <ShopeeSkuExport products={activeSkus} messages={content.shopeeExport} />
      ) : null}

      <WorkflowCard
        title={content.workflow.title}
        description="Quy trình chuẩn hóa dữ liệu và đối soát tự động của VClaw."
        steps={content.workflow.steps}
      />
    </AdminShell>
  );
}
