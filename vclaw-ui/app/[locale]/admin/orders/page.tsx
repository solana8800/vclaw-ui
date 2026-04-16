import { setRequestLocale } from "next-intl/server";
import { AdminPageView } from "@/components/admin/admin-page-view";
import { OrderKanban } from "@/components/admin/order-kanban";
import { getAdminPath } from "@/lib/admin-content";
import { getAdminLocaleContent } from "@/lib/admin-runtime";
import type { AppLocale } from "@/i18n/routing";

type OrdersPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function OrdersPage({ params }: OrdersPageProps) {
  const { locale } = (await params) as { locale: AppLocale };
  setRequestLocale(locale);
  const { admin, navigation, shell } = await getAdminLocaleContent(locale);

  return (
    <AdminPageView
      navigation={navigation}
      currentPath={getAdminPath(locale, "/admin/orders")}
      shell={shell}
      content={admin.orders}
      workflowCtaHref={getAdminPath(locale, "/admin/payments")}
      nextStepHref={getAdminPath(locale, "/admin/payments")}
    >
      {admin.orders.orderManager && (
        <OrderKanban messages={admin.orders.orderManager} />
      )}
    </AdminPageView>
  );
}
