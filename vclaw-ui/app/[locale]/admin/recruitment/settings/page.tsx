import { setRequestLocale } from "next-intl/server";
import { AdminPageView } from "@/components/admin/admin-page-view";
import { getAdminPath } from "@/lib/admin/content";
import { getAdminLocaleContent } from "@/lib/admin/runtime";
import { HhSettingsManager } from "@/components/recruitment/hh-settings-manager";
import type { AppLocale } from "@/i18n/routing";

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = (await params) as { locale: AppLocale };
  setRequestLocale(locale);
  const { admin, navigation, shell, workspaceLabels } = await getAdminLocaleContent(locale);

  return (
    <AdminPageView
      navigation={navigation}
      currentPath={getAdminPath(locale, "/admin/recruitment/settings")}
      shell={shell}
      content={admin.recruitment}
      workspaceLabels={workspaceLabels}
      showWorkflow={false}
      hideList={true}
    >
      <HhSettingsManager messages={admin.recruitment} />
    </AdminPageView>
  );
}
