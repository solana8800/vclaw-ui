import { setRequestLocale } from "next-intl/server";
import { AdminPageView } from "@/components/admin/admin-page-view";
import { getAdminPath } from "@/lib/admin-content";
import { getAdminLocaleContent } from "@/lib/admin-runtime";
import type { AppLocale } from "@/i18n/routing";

type CustomersPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function CustomersPage({ params }: CustomersPageProps) {
  const { locale } = (await params) as { locale: AppLocale };
  setRequestLocale(locale);
  const { admin, navigation, shell } = await getAdminLocaleContent(locale);

  return (
    <AdminPageView
      navigation={navigation}
      currentPath={getAdminPath(locale, "/admin/customers")}
      shell={shell}
      content={admin.customers}
      workflowCtaHref={getAdminPath(locale, "/admin/orders")}
      nextStepHref={getAdminPath(locale, "/admin/orders")}
    />
  );
}
