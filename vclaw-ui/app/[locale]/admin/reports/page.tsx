import { setRequestLocale } from "next-intl/server";
import {
  AdminShell,
  ListCard,
  StatsGrid,
} from "@/components/admin/admin-shell";
import { getAdminPath } from "@/lib/admin-content";
import { getAdminLocaleContent } from "@/lib/admin-runtime";
import type { AppLocale } from "@/i18n/routing";

type AdminReportsPageProps = {
  params: Promise<{ locale: string }>;
};

/**
 * Trang Báo cáo doanh thu cho VClaw.
 * Sử dụng pattern AdminShell để giữ tính nhất quán.
 */
export default async function AdminReportsPage({
  params,
}: AdminReportsPageProps) {
  const { locale } = (await params) as { locale: AppLocale };
  setRequestLocale(locale);

  // Lấy dữ liệu i18n từ admin.json
  const { admin, navigation, shell } = await getAdminLocaleContent(locale);
  const content = admin.reports;

  // Kiểm tra tính hợp lệ của dữ liệu trước khi render
  if (!content.status || !content.recentInvoices || !content.workflow) {
    return <div>Dữ liệu báo cáo không hợp lệ.</div>;
  }

  // Dữ liệu mẫu cho báo cáo hóa đơn
  const mockInvoices = [
    { id: "INV-001", client: "Nguyễn Văn A", amount: "5,000,000đ", status: content.status.paid },
    { id: "INV-002", client: "Trần Thị B", amount: "12,500,000đ", status: content.status.pending },
    { id: "INV-003", client: "Công ty V-FLOW", amount: "45,000,000đ", status: content.status.overdue },
  ];

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
      {/* Hiển thị các chỉ số quan trọng */}
      {content.stats ? <StatsGrid items={content.stats} /> : null}

      {/* Hiển thị danh sách hóa đơn gần đây */}
      <ListCard
        title={content.recentInvoices}
        description={content.description}
        items={mockInvoices.map((inv) => ({
          title: `${inv.client} (${inv.id})`,
          subtitle: inv.amount,
          badge: inv.status,
        }))}
      />

      {/* Hiển thị quy trình đối soát workflow */}
      <div className="mt-8 p-6 bg-secondary/10 rounded-xl border border-secondary/20 border-dashed">
        <h3 className="text-lg font-semibold mb-2">{content.workflow.title}</h3>
        <ul className="space-y-2">
          {content.workflow.steps.map((step, idx) => (
            <li key={idx} className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="w-6 h-6 flex items-center justify-center rounded-full bg-primary/20 text-primary font-mono text-xs">
                {idx + 1}
              </span>
              {step}
            </li>
          ))}
        </ul>
      </div>
    </AdminShell>
  );
}
