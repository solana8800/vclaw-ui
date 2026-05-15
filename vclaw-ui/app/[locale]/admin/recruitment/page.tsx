import { setRequestLocale } from "next-intl/server";
import { AdminPageView } from "@/components/admin/admin-page-view";
import { getAdminPath } from "@/lib/admin/content";
import { getAdminLocaleContent } from "@/lib/admin/runtime";
import { getJobPositions, getCandidates } from "@/lib/actions/recruitment/actions";
import { HhOverview } from "@/components/recruitment/hh-overview";
import type { AppLocale } from "@/i18n/routing";

export default async function RecruitmentPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = (await params) as { locale: AppLocale };

  setRequestLocale(locale);
  const { admin, navigation, shell, workspaceLabels } = await getAdminLocaleContent(locale);

  const jobPositions = await getJobPositions();
  const { data: candidates } = await getCandidates(undefined, 1, 5);

  const currentPath = getAdminPath(locale, "/admin/recruitment");

  if (!admin.recruitment) {
    return <div>Recruitment module not configured in translations.</div>;
  }

  // Mock stats for overview
  const stats = {
    totalJobs: jobPositions.length,
    totalCandidates: candidates.length * 10, // Giả lập tổng số
    newCandidates: candidates.filter(c => new Date(c.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length,
    contactedToday: Math.floor(candidates.length / 2)
  };

  return (
    <AdminPageView
      navigation={navigation}
      currentPath={currentPath}
      shell={shell}
      content={admin.recruitment}
      workflowCtaHref={currentPath}
      hideList={true}
      showWorkflow={false}
      workspaceLabels={workspaceLabels}
    >
      <HhOverview 
        messages={admin.recruitment} 
        stats={stats}
        recentCandidates={candidates}
      />
    </AdminPageView>
  );
}
