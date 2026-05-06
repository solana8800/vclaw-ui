import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminPageTabs } from "@/components/admin/admin-page-tabs";
import { OpenclawZalouserPanel } from "@/components/admin/zalouser-panel";
import { AutomationQueue } from "@/components/admin/automation-queue";
import { MarketingCampaignManager } from "@/components/admin/marketing-campaign-manager";
import { HeartbeatPanel } from "@/components/admin/heartbeat-panel";
import { CampaignDraftForm } from "@/components/admin/campaign-draft-form";
import { AutomationRulesConfig } from "@/components/admin/automation-rules-config";
import { AutomationJobManager } from "@/components/admin/automation-job-manager";
import { getAdminPath } from "@/lib/admin/content";
import { getAdminLocaleContent } from "@/lib/admin/runtime";
import { getZalouserStateFromDb } from "@/lib/zalouser/zalouser-cli-actions";
import { getAutomationJobs } from "@/lib/actions/automation-actions";
import { getAutomationRules } from "@/lib/actions/shop-settings-actions";
import { prisma } from "@/lib/db";
import type { AppLocale } from "@/i18n/routing";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function OpenclawZalouserPage({ params, searchParams }: PageProps) {
  const { locale } = (await params) as { locale: AppLocale };
  await searchParams;
  setRequestLocale(locale);
  const { admin, navigation, shell } = await getAdminLocaleContent(locale);
  const nav = admin.navigation;

  const [dbState, jobs, rules, jobStats] = await Promise.all([
    getZalouserStateFromDb(),
    getAutomationJobs(),
    getAutomationRules(),
    Promise.all([
      prisma.automationJob.count({ where: { status: "QUEUED" } }),
      prisma.automationJob.count({ where: { status: "DONE" } }),
      prisma.automationJob.count({ where: { approvalStatus: "PENDING_PUBLISH" } }),
    ]),
  ]);
  const [queued, done, pendingApproval] = jobStats;

  const tabs = [
    {
      id: "bot",
      label: nav?.tab_bot ?? "Bot Zalo",
      children: (
        <Suspense
          fallback={
            <div className="flex min-h-[420px] flex-col items-center justify-center gap-5 rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-glass)] p-12 text-center shadow-[0_32px_70px_-54px_var(--shadow-color)] backdrop-blur sm:rounded-3xl">
              <div
                className="h-12 w-12 animate-spin rounded-full border-2 border-[color:var(--line)] border-t-[color:var(--brand)]"
                aria-hidden
              />
              <p className="text-sm font-medium text-[color:var(--muted)]">Đang tải Zalo…</p>
            </div>
          }
        >
          <OpenclawZalouserPanel
            messages={admin.openclawZalouser}
            initialDbState={dbState}
          />
        </Suspense>
      ),
    },
    {
      id: "automation",
      label: nav?.tab_automation ?? "Tự động hóa",
      children: (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Đang chờ xử lý", value: queued, color: "var(--brand)" },
              { label: "Chờ duyệt đăng", value: pendingApproval, color: "var(--foreground-strong)" },
              { label: "Đã hoàn tất", value: done, color: "var(--muted)" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-4 py-3"
              >
                <div className="text-[10px] text-[color:var(--muted)] font-medium uppercase tracking-wider">
                  {s.label}
                </div>
                <div className="text-xl font-bold mt-0.5" style={{ color: s.color }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          <AutomationRulesConfig initialRules={rules} />

          {admin.automation.heartbeat ? (
            <HeartbeatPanel messages={admin.automation.heartbeat as any} />
          ) : null}

          {admin.automation.marketing ? (
            <MarketingCampaignManager messages={admin.automation.marketing} />
          ) : null}

          <div className="grid gap-6 xl:grid-cols-[minmax(0,400px)_1fr]">
            <CampaignDraftForm />
            <div className="space-y-6">
              {admin.automation.automationQueue ? (
                <AutomationQueue
                  initialJobs={jobs}
                  messages={admin.automation.automationQueue}
                />
              ) : null}
              <AutomationJobManager jobs={jobs as any} />
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <AdminShell
      navigation={navigation}
      currentPath={getAdminPath(locale, "/admin/zalouser")}
      title={admin.openclawZalouser.title}
      description={admin.openclawZalouser.description}
      badge={shell.badge}
      sidebarTitle={shell.sidebarTitle}
      sidebarDescription={shell.sidebarDescription}
    >
      <Suspense>
        <AdminPageTabs tabs={tabs} defaultTab="bot" />
      </Suspense>
    </AdminShell>
  );
}
