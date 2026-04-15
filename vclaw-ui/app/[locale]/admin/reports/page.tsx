import { setRequestLocale } from "next-intl/server";
import {
  AdminShell,
  ListCard,
  StatsGrid,
  WorkflowCard,
  SplitHero,
} from "@/components/admin/admin-shell";
import { getAdminPath } from "@/lib/admin-content";
import { getAdminLocaleContent } from "@/lib/admin-runtime";
import type { AppLocale } from "@/i18n/routing";

type AdminReportsPageProps = {
  params: Promise<{ locale: string }>;
};

/**
 * Trang Báo cáo vận hành & tăng trưởng cho VClaw.
 * Hiển thị cái nhìn toàn diện về hiệu suất kinh doanh, hiệu quả vận hành và tăng trưởng.
 */
export default async function AdminReportsPage({
  params,
}: AdminReportsPageProps) {
  const { locale } = (await params) as { locale: AppLocale };
  setRequestLocale(locale);

  // Lấy dữ liệu i18n từ admin.json
  const { admin, navigation, shell } = await getAdminLocaleContent(locale);
  const content = admin.reports;

  // Kiểm tra tính hợp lệ sơ bộ
  if (!content || !content.reportStats) {
    return <div>Dữ liệu báo cáo không khả dụng hoặc đang được cập nhật.</div>;
  }

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
      {/* 1. Phần Doanh thu - Ưu tiên hàng đầu */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight text-[color:var(--foreground-strong)]">
          Hiệu suất kinh doanh
        </h2>
        {content.reportStats.revenue && (
          <StatsGrid items={content.reportStats.revenue} />
        )}
      </section>

      {/* 2. Omnichannel & Operations Efficiency */}
      <SplitHero
        left={
          content.reportSections?.channels && (
            <ListCard
              title={content.reportSections.channels.title}
              description={content.reportSections.channels.description}
              items={content.reportSections.channels.items}
            />
          )
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
                      <div className="mt-1 text-2xl font-bold text-[color:var(--foreground-strong)]">{item.value}</div>
                      <div className="mt-1 text-xs text-[color:var(--brand-strong)]">{item.note}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {content.reportSections?.shipping && (
              <ListCard
                title={content.reportSections.shipping.title}
                description={content.reportSections.shipping.description}
                items={content.reportSections.shipping.items}
              />
            )}
          </div>
        }
      />

      {/* 3. Growth & AI Assistant Stats */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight text-[color:var(--foreground-strong)]">
          Tác động từ Trợ lý Tăng trưởng AI
        </h2>
        {content.reportStats.growth && (
          <StatsGrid items={content.reportStats.growth} />
        )}
      </section>

      {/* 4. Workflow & Process */}
      <WorkflowCard
        title={content.workflow.title}
        description="Quy trình chuẩn hóa dữ liệu và đối soát tự động của VClaw."
        steps={content.workflow.steps}
      />

    </AdminShell>
  );
}
