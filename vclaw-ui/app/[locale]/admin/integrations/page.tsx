import { headers } from "next/headers";
import { setRequestLocale } from "next-intl/server";
import { AdminPageView } from "@/components/admin/admin-page-view";
import { IntegrationPanel } from "@/components/admin/integration-panel";
import { getAdminPath } from "@/lib/admin-content";
import { getAdminLocaleContent } from "@/lib/admin-runtime";
import {
  getIntegrationAccounts,
  getIntegrationConnectionsPublic,
} from "@/lib/actions/integration-actions";
import type { AppLocale } from "@/i18n/routing";

type IntegrationsPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function IntegrationsPage({ params }: IntegrationsPageProps) {
  const { locale } = (await params) as { locale: AppLocale };
  setRequestLocale(locale);
  const { admin, navigation, shell } = await getAdminLocaleContent(locale);
  const [accounts, connections] = await Promise.all([
    getIntegrationAccounts(),
    getIntegrationConnectionsPublic(),
  ]);
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  const publicOrigin = host ? `${proto}://${host}` : undefined;

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
          initialConnections={connections}
          messages={admin.integrations.integrationPanel}
          publicOrigin={publicOrigin}
          oauthLocale={locale}
        />
      ) : null}
    </AdminPageView>
  );
}
