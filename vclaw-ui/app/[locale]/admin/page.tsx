import { setRequestLocale } from "next-intl/server";
import {
  AdminShell,
  ListCard,
  NextStepBanner,
  SplitHero,
  StatsGrid,
} from "@/components/admin/admin-shell";
import { OperatorStartBanner } from "@/components/admin/operator-start-banner";
import { LiveChatWidget, TaskInboxWidget } from "@/components/admin/dashboard-widgets";
import { normalizeInboxTaskType } from "@/lib/inbox-task-type";
import { getAdminPath } from "@/lib/admin-content";
import { getAdminLocaleContent } from "@/lib/admin-runtime";
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

  // Lấy các tác vụ thật từ Database
  const dbTasks: Task[] = await getTasks();

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
      {content.stats ? <StatsGrid items={content.stats} /> : null}

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

      {content.taskInbox && content.liveChat ? (
        <SplitHero
          left={
            <TaskInboxWidget
              title={content.taskInbox.title}
              tasks={dbTasks.map((t) => ({
                id: t.id,
                type: normalizeInboxTaskType(t.type),
                title: t.title,
                subtitle: t.subtitle || "",
                amount: t.amount || undefined,
                timeAgo: t.timeAgo || "Vừa xong",
                isUrgent: t.isUrgent,
              }))}
            />
          }
          right={
            <LiveChatWidget
              title={content.liveChat.title}
              messages={[
                {
                  id: "m1",
                  sender: "customer",
                  name: content.liveChat.messages.m1.name,
                  text: content.liveChat.messages.m1.text,
                  time: content.liveChat.messages.m1.time,
                },
                {
                  id: "m2",
                  sender: "agent",
                  name: content.liveChat.messages.m2.name,
                  text: content.liveChat.messages.m2.text,
                  time: content.liveChat.messages.m2.time,
                }
              ]}
            />
          }
        />
      ) : null}

      {content.extraLists?.map((section) => (
        <ListCard
          key={section.title}
          title={section.title}
          description={section.description}
          items={section.items}
        />
      ))}

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
