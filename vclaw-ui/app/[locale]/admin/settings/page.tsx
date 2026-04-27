import { setRequestLocale } from "next-intl/server";
import { AdminPageView } from "@/components/admin/admin-page-view";
import { SettingsForm } from "@/components/admin/settings-form";
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
  const initialData = shopRow ? {
    shopName: shopRow.shopName ?? undefined,
    bankQrUrl: shopRow.bankQrUrl ?? undefined,
    preferredChannel: shopRow.preferredChannel ?? undefined,
    bankName: shopRow.bankName ?? undefined,
    accountHolder: shopRow.accountHolder ?? undefined,
    accountNumber: shopRow.accountNumber ?? undefined,
  } : null;

  return (
    <AdminPageView
      navigation={navigation}
      currentPath={getAdminPath(locale, "/admin/settings")}
      shell={shell}
      content={admin.settings}
      showGatewayStatus={true}
    >
      <div className="grid gap-6">
        <SettingsForm initialData={initialData} />
      </div>
    </AdminPageView>
  );
}
