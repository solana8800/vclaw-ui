import { setRequestLocale } from "next-intl/server";
import { AdminPageView } from "@/components/admin/admin-page-view";
import { getAdminPath } from "@/lib/admin-content";
import { getAdminLocaleContent } from "@/lib/admin-runtime";
import type { AppLocale } from "@/i18n/routing";
import { TaskInboxManager } from "@/components/admin/task-inbox-manager";

type InboxPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function InboxPage({ params }: InboxPageProps) {
  const { locale } = (await params) as { locale: AppLocale };
  setRequestLocale(locale);
  const { admin, navigation, shell } = await getAdminLocaleContent(locale);

  return (
    <AdminPageView
      navigation={navigation}
      currentPath={getAdminPath(locale, "/admin/inbox")}
      shell={shell}
      content={admin.inbox}
      workflowCtaHref={getAdminPath(locale, "/admin/customers")}
      nextStepHref={getAdminPath(locale, "/admin/customers")}
    >
      {admin.inbox.inboxManager && (
        <TaskInboxManager messages={admin.inbox.inboxManager} />
      )}
    </AdminPageView>
  );
}
