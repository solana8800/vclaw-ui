import { setRequestLocale } from "next-intl/server";
import { AdminPageView } from "@/components/admin/admin-page-view";
import { IntegrationPanel } from "@/components/admin/integration-panel";
import { getAdminPath } from "@/lib/admin-content";
import { getAdminLocaleContent } from "@/lib/admin-runtime";
import { getIntegrationAccounts } from "@/lib/actions/integration-actions";
import type { AppLocale } from "@/i18n/routing";

type IntegrationsPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function IntegrationsPage({ params }: IntegrationsPageProps) {
  const { locale } = (await params) as { locale: AppLocale };
  setRequestLocale(locale);
  const { admin, navigation, shell } = await getAdminLocaleContent(locale);
  const accounts = await getIntegrationAccounts();

  return (
    <AdminPageView
      navigation={navigation}
      currentPath={getAdminPath(locale, "/admin/integrations")}
      shell={shell}
      content={admin.integrations}
      workflowCtaHref={getAdminPath(locale, "/admin/automation")}
      nextStepHref={getAdminPath(locale, "/admin/automation")}
    >
      {admin.integrations.integrationPanel ? (
        <IntegrationPanel
          initialAccounts={accounts}
          messages={admin.integrations.integrationPanel}
        />
      ) : null}
    </AdminPageView>
  );
}
