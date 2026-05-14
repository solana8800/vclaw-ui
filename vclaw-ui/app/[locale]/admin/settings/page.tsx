import { Fingerprint, Store, Truck, ServerCrash } from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import { AdminPageView } from "@/components/admin/admin-page-view";
import { AdminPageTabs } from "@/components/admin/admin-page-tabs";
import { BankSettings } from "@/components/admin/bank-settings";
import { WorkspaceSettings } from "@/components/admin/workspace-settings";
import { ShippingSettings } from "@/components/admin/shipping-settings";
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
      <AdminPageTabs
        defaultTab="workspace"
        tabs={[
          {
            id: "workspace",
            label: admin.settings.workspace?.identityTitle || "Hệ thống",
            icon: <Fingerprint className="h-4 w-4 mr-2" />,
            children: (
              <div className="py-2">
                {admin.settings.workspace && (
                  <WorkspaceSettings 
                    initialSettings={shopRow} 
                    messages={admin.settings.workspace} 
                    common={admin.common}
                  />
                )}
              </div>
            )
          },
          {
            id: "bank",
            label: admin.settings.bank?.title || "Bán hàng",
            icon: <Store className="h-4 w-4 mr-2" />,
            children: (
              <div className="py-2">
                {admin.settings.bank && (
                  <BankSettings initialSettings={shopRow} messages={admin.settings.bank} />
                )}
              </div>
            )
          },
          {
            id: "shipping",
            label: admin.shipping?.title || "Giao vận",
            icon: <Truck className="h-4 w-4 mr-2" />,
            children: (
              <div className="py-2">
                <ShippingSettings initialSettings={shopRow} />
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
