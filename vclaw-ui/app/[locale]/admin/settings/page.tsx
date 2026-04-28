import { setRequestLocale } from "next-intl/server";
import { AdminPageView } from "@/components/admin/admin-page-view";
import { BankSettings } from "@/components/admin/bank-settings";
import { WorkspaceSettings } from "@/components/admin/workspace-settings";
import { OpenclawZeroTokenStatus } from "@/components/admin/openclaw-zero-token-status";
import { getAdminPath } from "@/lib/admin/content";
import { getAdminLocaleContent } from "@/lib/admin/runtime";
import { getShopSettings } from "@/lib/actions/shop-settings-actions";
import type { AppLocale } from "@/i18n/routing";

type SettingsPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { locale } = (await params) as { locale: AppLocale };
  setRequestLocale(locale);
  const { admin, navigation, shell } = await getAdminLocaleContent(locale);
  const shopRow = await getShopSettings();

  return (
    <AdminPageView
      navigation={navigation}
      currentPath={getAdminPath(locale, "/admin/settings")}
      shell={shell}
      content={admin.settings}
      showGatewayStatus={false}
      hideList={true}
    >
      <div className="grid gap-8">
        <BankSettings initialSettings={shopRow} />
        <WorkspaceSettings initialSettings={shopRow} />
        
        <div className="mt-4 pt-8 border-t border-[color:var(--line-strong)]">
          <OpenclawZeroTokenStatus />
        </div>
      </div>
    </AdminPageView>
  );
}
