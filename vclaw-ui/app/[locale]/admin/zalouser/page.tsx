import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { AdminPageView } from "@/components/admin/admin-page-view";
import { OpenclawZalouserPanel } from "@/components/admin/zalouser-panel";
import { getAdminPath } from "@/lib/admin-content";
import { getAdminLocaleContent } from "@/lib/admin-runtime";
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
      workflowCtaHref={getAdminPath(locale, "/admin/integrations")}
      nextStepHref={getAdminPath(locale, "/admin/integrations")}
    >
      <Suspense
        fallback={
          <div className="mt-8 flex min-h-[400px] flex-col items-center justify-center gap-6 rounded-3xl border border-[color:var(--line)] bg-[color:var(--surface)] p-12 text-center">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-[color:var(--line)] border-t-[color:var(--foreground-strong)]" />
            <p className="text-sm font-medium text-[color:var(--muted)]">Đang tải…</p>
          </div>
        }
      >
        <OpenclawZalouserPanel 
          messages={admin.openclawZalouser as any} 
          initialDbState={dbState}
        />
      </Suspense>
    </AdminPageView>
  );
}
