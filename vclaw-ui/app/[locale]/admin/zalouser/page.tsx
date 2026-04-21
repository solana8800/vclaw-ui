import { setRequestLocale } from "next-intl/server";
import { AdminPageView } from "@/components/admin/admin-page-view";
import { OpenclawZalouserPanel } from "@/components/admin/zalouser-panel";
import { getAdminPath } from "@/lib/admin-content";
import { getAdminLocaleContent } from "@/lib/admin-runtime";
import type { AppLocale } from "@/i18n/routing";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function OpenclawZalouserPage({ params }: PageProps) {
  const { locale } = (await params) as { locale: AppLocale };
  setRequestLocale(locale);
  const { admin, navigation, shell } = await getAdminLocaleContent(locale);

  return (
    <AdminPageView
      navigation={navigation}
      currentPath={getAdminPath(locale, "/admin/zalouser")}
      shell={shell}
      content={admin.openclawZalouser}
      workflowCtaHref={getAdminPath(locale, "/admin/integrations")}
      nextStepHref={getAdminPath(locale, "/admin/integrations")}
    >
      <OpenclawZalouserPanel messages={admin.openclawZalouser.zalouserPanel} />
    </AdminPageView>
  );
}
