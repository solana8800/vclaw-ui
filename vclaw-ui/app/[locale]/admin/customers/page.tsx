import { setRequestLocale } from "next-intl/server";
import { AdminPageView } from "@/components/admin/admin-page-view";
import { CustomerManager } from "@/components/admin/customer-manager";
import { ChannelThreadPanel } from "@/components/admin/channel-thread-panel";
import { TaskInboxManager } from "@/components/admin/task-inbox-manager";
import { getConversationWithMessages, type ConversationWithFullMessages } from "@/lib/channel/conversations-db";
import { getTasks } from "@/lib/commerce/tasks";
import { getAdminPath } from "@/lib/admin/content";
import { getAdminLocaleContent } from "@/lib/admin/runtime";
import { getCustomers } from "@/lib/actions/customer-actions";
import type { AppLocale } from "@/i18n/routing";
import type { Task } from "@prisma/client";
import { Users } from "lucide-react";

type CustomersPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string; thread?: string; provider?: string }>;
};

export default async function CustomersPage({ params, searchParams }: CustomersPageProps) {
  const { locale } = (await params) as { locale: AppLocale };
  const sp = await searchParams;
  setRequestLocale(locale);
  const { admin, navigation, shell } = await getAdminLocaleContent(locale);

  // Fetch data for all tabs
  const [customers, dbTasks] = await Promise.all([
    getCustomers(),
    getTasks(),
  ]);

  const taskRows = dbTasks.map((t: Task) => ({
    id: t.id,
    type: t.type,
    title: t.title,
    subtitle: t.subtitle ?? "",
    amount: t.amount,
    timeAgo: t.timeAgo,
    isUrgent: t.isUrgent,
  }));

  const threadId = sp.thread?.trim();
  const threadData =
    threadId ?
      await getConversationWithMessages(threadId).catch(() => null)
    : null;

  const currentPath = getAdminPath(locale, "/admin/customers");

  return (
    <AdminPageView
      navigation={navigation}
      currentPath={currentPath}
      shell={shell}
      content={admin.customers}
      workflowCtaHref={getAdminPath(locale, "/admin/orders")}
      nextStepHref={getAdminPath(locale, "/admin/orders")}
      hideList={true}
    >
      <div className="space-y-10">
        {/* Khu vực xử lý nhanh các tác vụ chờ duyệt */}
        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-1 bg-orange-500 rounded-full" />
            <h2 className="text-lg font-black text-[color:var(--foreground-strong)] tracking-tight uppercase">
              Cần xử lý ngay
            </h2>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              dbTasks.length > 0 ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-400"
            }`}>
              {dbTasks.length} tác vụ
            </span>
          </div>
          {admin.inbox.inboxManager ? (
            <TaskInboxManager
              key={dbTasks.map((t: Task) => `${t.id}:${t.updatedAt.toISOString()}`).join("|")}
              messages={admin.inbox.inboxManager}
              initialTasks={taskRows}
            />
          ) : null}
        </div>

        {/* Danh sách khách hàng & hội thoại chính */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-1 bg-[color:var(--brand)] rounded-full" />
            <h2 className="text-lg font-black text-[color:var(--foreground-strong)] tracking-tight uppercase">
              {admin.customers.title || "Khách hàng & Hội thoại"}
            </h2>
          </div>
          {admin.customers.customerManager ? (
            <CustomerManager
              initialCustomers={customers}
              messages={admin.customers.customerManager}
              locale={locale}
              threadMessages={admin.inbox.channelThreadView}
            />
          ) : null}
        </div>
      </div>

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
          // Panel này sẽ đóng bằng cách quay về trang customers (xóa thread param)
          backHref={currentPath}
          onClose={undefined} 
        />
      ) : null}
    </AdminPageView>
  );
}
