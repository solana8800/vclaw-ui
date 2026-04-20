import { setRequestLocale } from "next-intl/server";

import { AdminShell } from "@/components/admin/admin-shell";
import { OperatorGuideView } from "@/components/admin/operator-guide-view";
import { getAdminPath } from "@/lib/admin-content";
import { getAdminLocaleContent } from "@/lib/admin-runtime";
import type { AppLocale } from "@/i18n/routing";

type AdminGuidePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AdminGuidePage({ params }: AdminGuidePageProps) {
  const { locale } = (await params) as { locale: AppLocale };
  setRequestLocale(locale);
  const { admin, navigation, shell } = await getAdminLocaleContent(locale);

  return (
    <AdminShell
      navigation={navigation}
      currentPath={getAdminPath(locale, "/admin/guide")}
      title={admin.guide.title}
      description={admin.guide.description}
      badge={shell.badge}
      sidebarTitle={shell.sidebarTitle}
      sidebarDescription={shell.sidebarDescription}
    >
      <OperatorGuideView
        content={admin.guide}
        resolvePath={(path) => getAdminPath(locale, path)}
      />
    </AdminShell>
  );
}
