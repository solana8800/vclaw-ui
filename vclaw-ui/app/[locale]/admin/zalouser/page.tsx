import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { AdminPageView } from "@/components/admin/admin-page-view";
import { OpenclawZalouserPanel } from "@/components/admin/zalouser-panel";
import { getAdminPath } from "@/lib/admin/content";
import { getAdminLocaleContent } from "@/lib/admin/runtime";
import { getZalouserStateFromDb } from "@/lib/zalouser/zalouser-cli-actions";
import type { AppLocale } from "@/i18n/routing";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function OpenclawZalouserPage({ params }: PageProps) {
  const { locale } = (await params) as { locale: AppLocale };
  setRequestLocale(locale);
  const { admin, navigation, shell } = await getAdminLocaleContent(locale);
  const dbState = await getZalouserStateFromDb();

  return (
    <AdminPageView
      navigation={navigation}
      currentPath={getAdminPath(locale, "/admin/zalouser")}
      shell={shell}
      content={admin.openclawZalouser}
      showWorkflow={false}
      headerCompact
      workflowCtaHref={getAdminPath(locale, "/admin/settings")}
      nextStepHref={getAdminPath(locale, "/admin/settings")}
    >
      <Suspense
        fallback={
          <div className="mt-6 flex min-h-[420px] flex-col items-center justify-center gap-5 rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-glass)] p-12 text-center shadow-[0_32px_70px_-54px_var(--shadow-color)] backdrop-blur sm:rounded-3xl">
            <div
              className="h-12 w-12 animate-spin rounded-full border-2 border-[color:var(--line)] border-t-[color:var(--brand)]"
              aria-hidden
            />
            <p className="text-sm font-medium text-[color:var(--muted)]">Đang tải Zalo…</p>
          </div>
        }
      >
        <OpenclawZalouserPanel 
          messages={admin.openclawZalouser} 
          initialDbState={dbState}
        />
      </Suspense>
    </AdminPageView>
  );
}
