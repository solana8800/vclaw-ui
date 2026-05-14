import { setRequestLocale } from "next-intl/server";
import { AdminPageView } from "@/components/admin/admin-page-view";
import { CustomerManager } from "@/components/admin/customer-manager";
import { ChannelThreadPanel } from "@/components/admin/channel-thread-panel";
import { getConversationWithMessages, type ConversationWithFullMessages } from "@/lib/channel/conversations-db";
import { getAdminPath } from "@/lib/admin/content";
import { getAdminLocaleContent } from "@/lib/admin/runtime";
import { getCustomers } from "@/lib/actions/customer-actions";
import { AdminPagination } from "@/components/admin/admin-pagination";
import type { AppLocale } from "@/i18n/routing";

type CustomersPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string; thread?: string; provider?: string; page?: string }>;
};

export default async function CustomersPage({ params, searchParams }: CustomersPageProps) {
  const { locale } = (await params) as { locale: AppLocale };
  const sp = await searchParams;
  const currentPage = Number(sp.page) || 1;

  setRequestLocale(locale);
  const { admin, navigation, shell } = await getAdminLocaleContent(locale);

  const { data: customers, totalPages } = await getCustomers(currentPage, 20);

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
      {admin.customers.customerManager ? (
        <div className="space-y-4 mb-6">
          <CustomerManager
            initialCustomers={customers}
            messages={admin.customers.customerManager}
            locale={locale}
            threadMessages={admin.inbox.channelThreadView}
          />
          <AdminPagination
            currentPage={currentPage}
            totalPages={totalPages}
            baseUrl={currentPath}
          />
        </div>
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
          // Panel này sẽ đóng bằng cách quay về trang customers (xóa thread param)
          backHref={currentPath}
          onClose={undefined} 
        />
      ) : null}
    </AdminPageView>
  );
}
