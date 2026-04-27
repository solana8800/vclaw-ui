import { setRequestLocale } from "next-intl/server";
import { AdminPageView } from "@/components/admin/admin-page-view";
import { SettingsShopSummary } from "@/components/admin/settings-shop-summary";
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
      showGatewayStatus={true}
    >
      {admin.settings.shopSummary ? (
        <SettingsShopSummary
          settings={shopRow}
          messages={admin.settings.shopSummary}
          editHref={getAdminPath(locale, "/admin/settings")}
        />
      ) : null}
    </AdminPageView>
  );
}
