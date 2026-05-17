import { setRequestLocale } from "next-intl/server";
import { AdminPageView } from "@/components/admin/admin-page-view";
import { getAdminPath } from "@/lib/admin/content";
import { getAdminLocaleContent } from "@/lib/admin/runtime";
import { getJobPositions, getCandidates } from "@/lib/actions/recruitment/actions";
import { CandidateManager } from "@/components/recruitment/candidate-manager";
import type { AppLocale } from "@/i18n/routing";

export default async function CandidatesPage({ params, searchParams }: { 
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; job?: string }>;
}) {
  const { locale } = (await params) as { locale: AppLocale };
  const sp = await searchParams;
  const currentPage = Number(sp.page) || 1;
  const selectedJobId = sp.job;

  setRequestLocale(locale);
  const { admin, navigation, shell, workspaceLabels } = await getAdminLocaleContent(locale);

  const jobPositions = await getJobPositions();
  const pageSize = 20;
  const { data: candidates, totalPages, total } = await getCandidates(
    selectedJobId,
    currentPage,
    pageSize,
  );

  return (
    <AdminPageView
      navigation={navigation}
      currentPath={getAdminPath(locale, "/admin/recruitment/candidates")}
      shell={shell}
      content={admin.recruitment}
      workspaceLabels={workspaceLabels}
      showWorkflow={false}
      hideList={true}
    >
      <CandidateManager
        locale={locale}
        messages={admin.recruitment}
        initialJobs={jobPositions as any}
        initialCandidates={candidates as any}
        total={total}
        totalPages={totalPages}
        currentPage={currentPage}
        pageSize={pageSize}
        selectedJobId={selectedJobId}
      />
    </AdminPageView>
  );
}
