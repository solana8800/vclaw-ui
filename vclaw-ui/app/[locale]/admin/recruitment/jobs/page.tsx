import { setRequestLocale } from "next-intl/server";
import { AdminPageView } from "@/components/admin/admin-page-view";
import { getAdminPath } from "@/lib/admin/content";
import { getAdminLocaleContent } from "@/lib/admin/runtime";
import { JobManager } from "@/components/recruitment/job-manager";
import { getJobPositions } from "@/lib/actions/recruitment/actions";
import { getRecruitmentSettings } from "@/lib/actions/recruitment-settings-actions";
import type { AppLocale } from "@/i18n/routing";

export default async function JobsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = (await params) as { locale: AppLocale };
  setRequestLocale(locale);
  const { admin, navigation, shell, workspaceLabels } = await getAdminLocaleContent(locale);
  const [jobs, recruitmentSettings] = await Promise.all([
    getJobPositions(),
    getRecruitmentSettings(),
  ]);

  return (
    <AdminPageView
      navigation={navigation}
      currentPath={getAdminPath(locale, "/admin/recruitment/jobs")}
      shell={shell}
      content={admin.recruitment}
      workspaceLabels={workspaceLabels}
      showWorkflow={false}
      hideList={true}
    >
      <JobManager
        jobs={jobs as any}
        messages={admin.recruitment}
        defaultLinkedInCompanyUrl={recruitmentSettings?.linkedinCompanyUrl ?? null}
      />
    </AdminPageView>
  );
}
