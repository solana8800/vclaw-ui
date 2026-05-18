import { setRequestLocale } from "next-intl/server";
import { AdminPageView } from "@/components/admin/admin-page-view";
import { AdminPageTabs } from "@/components/admin/admin-page-tabs";
import { OpenclawZeroTokenStatus } from "@/components/admin/openclaw-zero-token-status";
import { getAdminPath } from "@/lib/admin/content";
import { getAdminLocaleContent } from "@/lib/admin/runtime";
import { HhSettingsManager } from "@/components/recruitment/hh-settings-manager";
import type { AppLocale } from "@/i18n/routing";
import { Users, ServerCrash } from "lucide-react";

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = (await params) as { locale: AppLocale };
  setRequestLocale(locale);
  const { admin, navigation, shell, workspaceLabels } = await getAdminLocaleContent(locale);
  const { getRecruitmentSettings } = await import("@/lib/actions/recruitment-settings-actions");
  const initialSettings = await getRecruitmentSettings();

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
      <AdminPageTabs
        defaultTab="settings"
        tabs={[
          {
            id: "settings",
            label: admin.recruitment.settings?.title || "Tuyển dụng",
            icon: <Users className="h-4 w-4 mr-2" />,
            children: (
              <div className="py-2">
                <HhSettingsManager 
                  messages={admin.recruitment} 
                  initialSettings={initialSettings} 
                />
              </div>
            )
          },
          {
            id: "status",
            label: "Gateway Status",
            icon: <ServerCrash className="h-4 w-4 mr-2" />,
            children: (
              <div className="py-2">
                <OpenclawZeroTokenStatus />
              </div>
            )
          }
        ]}
      />
    </AdminPageView>
  );
}
