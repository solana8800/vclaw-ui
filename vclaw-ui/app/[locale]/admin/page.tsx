import { setRequestLocale } from "next-intl/server";
import {
  AdminShell,
  ListCard,
  NextStepBanner,
  SplitHero,
  StatsGrid,
} from "@/components/admin/admin-shell";
import { LiveChatWidget, TaskInboxWidget } from "@/components/admin/dashboard-widgets";
import { getAdminPath } from "@/lib/admin-content";
import { getAdminLocaleContent } from "@/lib/admin-runtime";
import type { AppLocale } from "@/i18n/routing";

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

      {content.taskInbox && content.liveChat ? (
        <SplitHero
          left={
            <TaskInboxWidget
              title={content.taskInbox.title}
              tasks={[
                {
                  id: "pay-1",
                  type: "payment_review",
                  title: content.taskInbox.tasks.pay1.title,
                  subtitle: content.taskInbox.tasks.pay1.subtitle,
                  amount: content.taskInbox.tasks.pay1.amount,
                  timeAgo: content.taskInbox.tasks.pay1.time,
                  isUrgent: true,
                },
                {
                  id: "book-1",
                  type: "booking_confirm",
                  title: content.taskInbox.tasks.book1.title,
                  subtitle: content.taskInbox.tasks.book1.subtitle,
                  timeAgo: content.taskInbox.tasks.book1.time,
                  isUrgent: false,
                },
                {
                  id: "ship-1",
                  type: "shipping_update",
                  title: content.taskInbox.tasks.ship1.title,
                  subtitle: content.taskInbox.tasks.ship1.subtitle,
                  timeAgo: content.taskInbox.tasks.ship1.time,
                  isUrgent: false,
                }
              ]}
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
