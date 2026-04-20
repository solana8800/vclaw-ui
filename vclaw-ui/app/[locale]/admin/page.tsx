import { setRequestLocale } from "next-intl/server";
import {
  AdminShell,
  ListCard,
  NextStepBanner,
  SplitHero,
  StatsGrid,
} from "@/components/admin/admin-shell";
import { OperatorStartBanner } from "@/components/admin/operator-start-banner";
import { TaskInboxWidget } from "@/components/admin/dashboard-widgets";
import { RecentActivityCard } from "@/components/admin/recent-activity-card";
import { normalizeInboxTaskType } from "@/lib/inbox-task-type";
import { getAdminPath } from "@/lib/admin-content";
import { getAdminLocaleContent } from "@/lib/admin-runtime";
import {
  getAdminOverviewSnapshot,
  getOverviewOpenOrdersList,
  getOverviewPendingPaymentsList,
  getRecentOrdersForActivity,
} from "@/lib/report-stats";
import { getTasks } from "@/lib/tasks";
import type { AppLocale } from "@/i18n/routing";
import type { Task } from "@prisma/client";

type AdminOverviewPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AdminOverviewPage({
  params,
}: AdminOverviewPageProps) {
  const { locale } = (await params) as { locale: AppLocale };
  setRequestLocale(locale);
  const { admin, navigation, shell } = await getAdminLocaleContent(locale);
  const content = admin.overview;

  const [dbTasks, overviewSnap, recentOrders, openOrderRows, pendingPayRows] =
    await Promise.all([
      getTasks(),
      getAdminOverviewSnapshot(),
      getRecentOrdersForActivity(5),
      getOverviewOpenOrdersList(5),
      getOverviewPendingPaymentsList(5),
    ]);

  const live = content.dashboardStats;
  const overviewStatsItems =
    live != null
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

  const moneyLocale = locale === "en" ? "en-US" : "vi-VN";
  const openOrderItems = openOrderRows.map((o) => ({
    title: `${o.orderNumber} · ${o.customer.name}`,
    subtitle: `${o.status} · ${o.amount.toLocaleString(moneyLocale)} đ`,
  }));
  const pendingPayItems = pendingPayRows.map((p) => ({
    title: `${p.order.orderNumber}`,
    subtitle: `${p.method} · ${p.amount.toLocaleString(moneyLocale)} đ`,
    badge: p.status,
  }));

  return (
    <AdminShell
      navigation={navigation}
      currentPath={getAdminPath(locale, "/admin")}
      title={content.title}
      description={content.description}
      badge={shell.badge}
      sidebarTitle={shell.sidebarTitle}
      sidebarDescription={shell.sidebarDescription}
    >
      {live && overviewStatsItems.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xl font-bold tracking-tight text-[color:var(--foreground-strong)]">
            {live.sectionTitle}
          </h2>
          <StatsGrid items={overviewStatsItems} />
        </section>
      ) : null}

      {content.operatorStart ? (
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
      ) : null}

      {content.taskInbox && content.recentActivity ? (
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
      ) : null}

      {content.dbLists ? (
        <div className="grid gap-6 lg:grid-cols-2">
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
        </div>
      ) : null}

      {content.nextStep ? (
        <NextStepBanner
          href={getAdminPath(locale, "/admin/inbox")}
          label={content.nextStep.label}
          copy={content.nextStep.copy}
        />
      ) : null}
    </AdminShell>
  );
}
