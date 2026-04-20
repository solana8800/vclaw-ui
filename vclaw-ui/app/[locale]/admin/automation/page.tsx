import { setRequestLocale } from "next-intl/server";
import { AdminPageView } from "@/components/admin/admin-page-view";
import { AutomationQueue } from "@/components/admin/automation-queue";
import { getAdminPath } from "@/lib/admin-content";
import { getAdminLocaleContent } from "@/lib/admin-runtime";
import { getAutomationJobs } from "@/lib/actions/automation-actions";
import type { AppLocale } from "@/i18n/routing";

type AutomationPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AutomationPage({ params }: AutomationPageProps) {
  const { locale } = (await params) as { locale: AppLocale };
  setRequestLocale(locale);
  const { admin, navigation, shell } = await getAdminLocaleContent(locale);
  const jobs = await getAutomationJobs();

  return (
    <AdminPageView
      navigation={navigation}
      currentPath={getAdminPath(locale, "/admin/automation")}
      shell={shell}
      content={admin.automation}
      workflowCtaHref={getAdminPath(locale, "/admin/settings")}
      nextStepHref={getAdminPath(locale, "/admin/settings")}
    >
      {admin.automation.automationQueue ? (
        <AutomationQueue
          initialJobs={jobs}
          messages={admin.automation.automationQueue}
        />
      ) : null}
    </AdminPageView>
  );
}
