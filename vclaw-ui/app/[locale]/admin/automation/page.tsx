import { setRequestLocale } from "next-intl/server";
import { AdminPageView } from "@/components/admin/admin-page-view";
import { AutomationQueue } from "@/components/admin/automation-queue";
import { MarketingCampaignManager } from "@/components/admin/marketing-campaign-manager";
import { HeartbeatPanel } from "@/components/admin/heartbeat-panel";
import { CampaignDraftForm } from "@/components/admin/campaign-draft-form";
import { getAdminPath } from "@/lib/admin/content";
import { getAdminLocaleContent } from "@/lib/admin/runtime";
import { getAutomationJobs } from "@/lib/actions/automation-actions";
import { prisma } from "@/lib/db";
import type { AppLocale } from "@/i18n/routing";

type AutomationPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AutomationPage({ params }: AutomationPageProps) {
  const { locale } = (await params) as { locale: AppLocale };
  setRequestLocale(locale);
  const { admin, navigation, shell } = await getAdminLocaleContent(locale);

  // Lấy dữ liệu thực từ DB song song
  const [jobs, jobStats] = await Promise.all([
    getAutomationJobs(),
    Promise.all([
      prisma.automationJob.count({ where: { status: "QUEUED" } }),
      prisma.automationJob.count({ where: { status: "DONE" } }),
      prisma.automationJob.count({ where: { approvalStatus: "PENDING_PUBLISH" } }),
    ]),
  ]);
  const [queued, done, pendingApproval] = jobStats;

  return (
    <AdminPageView
      navigation={navigation}
      currentPath={getAdminPath(locale, "/admin/automation")}
      shell={shell}
      content={admin.automation}
      workflowCtaHref={getAdminPath(locale, "/admin/settings")}
      nextStepHref={getAdminPath(locale, "/admin/settings")}
      hideList
      showWorkflow={false}
    >
      {/* Live stats job từ DB */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Đang chờ xử lý", value: queued, color: "var(--brand)" },
          { label: "Chờ duyệt đăng", value: pendingApproval, color: "var(--foreground-strong)" },
          { label: "Đã hoàn tất", value: done, color: "var(--muted)" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-4 py-3">
            <div className="text-[10px] text-[color:var(--muted)] font-medium uppercase tracking-wider">{s.label}</div>
            <div className="text-xl font-bold mt-0.5" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/*
        Layout mới: vertical stacking fullwidth
        - Hàng 1: Heartbeat (full width) — AI nhịp tim quan trọng nhất
        - Hàng 2: Marketing scanner (full width) — quét khách hàng kẹt
        - Hàng 3: Form chiến dịch + Queue (side-by-side khi đủ rộng)
      */}

      {/* Heartbeat full width */}
      {admin.automation.heartbeat ? (
        <HeartbeatPanel messages={admin.automation.heartbeat as any} />
      ) : null}

      {/* Marketing scanner full width */}
      {admin.automation.marketing ? (
        <MarketingCampaignManager messages={admin.automation.marketing} />
      ) : null}

      {/* Form chiến dịch + Queue — chia 2 cột trên màn lớn */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,400px)_1fr]">
        <CampaignDraftForm />

        {admin.automation.automationQueue ? (
          <AutomationQueue
            initialJobs={jobs}
            messages={admin.automation.automationQueue}
          />
        ) : null}
      </div>
    </AdminPageView>
  );
}
