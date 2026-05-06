import { setRequestLocale } from "next-intl/server";
import { AdminPageView } from "@/components/admin/admin-page-view";
import { ChannelConversationsCard } from "@/components/admin/channel-conversations-card";
import { ChannelThreadPanel } from "@/components/admin/channel-thread-panel";
import { getAdminPath } from "@/lib/admin/content";
import { getAdminLocaleContent } from "@/lib/admin/runtime";
import { listConversationsForAdmin, getConversationWithMessages } from "@/lib/channel/conversations-db";
import { getTasks } from "@/lib/commerce/tasks";
import type { AppLocale } from "@/i18n/routing";
import { TaskInboxManager } from "@/components/admin/task-inbox-manager";
import type { Task } from "@prisma/client";
import type { ConversationWithLastMessage, ConversationWithFullMessages } from "@/lib/channel/conversations-db";

type InboxPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ thread?: string; provider?: string }>;
};

export default async function InboxPage({ params, searchParams }: InboxPageProps) {
  const { locale } = (await params) as { locale: AppLocale };
  const sp = await searchParams;
  setRequestLocale(locale);
  const { admin, navigation, shell } = await getAdminLocaleContent(locale);
  const dbTasks = await getTasks();
  const taskRows = dbTasks.map((t: Task) => ({
    id: t.id,
    type: t.type,
    title: t.title,
    subtitle: t.subtitle ?? "",
    amount: t.amount,
    timeAgo: t.timeAgo,
    isUrgent: t.isUrgent,
  }));

  const provider = sp.provider?.trim();
  const convs = await listConversationsForAdmin(40, provider);
  const convRows = convs.map((c: any) => ({
    id: c.id,
    provider: c.provider,
    title: c.resolvedTitle,
    externalThreadId: c.externalThreadId,
    updatedAt: c.updatedAt.toISOString(),
    lastSnippet: (c.messages as any)[0]?.body ?? null,
    sourceLabel: c.sourceLabel,
    typeLabel: c.typeLabel,
    origin: c.origin,
    chatType: c.chatType,
  }));

  const threadId = sp.thread?.trim();
  const threadData =
    threadId ?
      await getConversationWithMessages(threadId).catch(() => null)
    : null;

  return (
    <AdminPageView
      navigation={navigation}
      currentPath={getAdminPath(locale, "/admin/inbox")}
      shell={shell}
      content={admin.inbox}
      workflowCtaHref={getAdminPath(locale, "/admin/customers")}
      nextStepHref={getAdminPath(locale, "/admin/customers")}
      hideList={true}
    >
      {admin.inbox.inboxManager ? (
        <TaskInboxManager
          key={dbTasks.map((t: Task) => `${t.id}:${t.updatedAt.toISOString()}`).join("|")}
          messages={admin.inbox.inboxManager}
          initialTasks={taskRows}
        />
      ) : null}
      {admin.inbox.channelThreads ? (
        <ChannelConversationsCard
          locale={locale}
          rows={convRows}
          messages={admin.inbox.channelThreads}
        />
      ) : null}
      {threadData && admin.inbox.channelThreadView ? (
        <ChannelThreadPanel
          locale={locale}
          conversationTitle={(threadData as any).resolvedTitle}
          openclawSessionKey={threadData.openclawSessionKey}
          messages={admin.inbox.channelThreadView}
          rows={(threadData as ConversationWithFullMessages).messages.map((m: any) => ({
            id: m.id,
            direction: m.direction,
            body: m.body,
            createdAt: m.createdAt.toISOString(),
          }))}
        />
      ) : null}
    </AdminPageView>
  );
}
