import { setRequestLocale } from "next-intl/server";
import { AdminPageView } from "@/components/admin/admin-page-view";
import { OrderKanban, type OrderItem } from "@/components/admin/order-kanban";
import { getAdminPath } from "@/lib/admin/content";
import { getAdminLocaleContent } from "@/lib/admin/runtime";
import { getOrders } from "@/lib/commerce/orders";
import { getCustomers } from "@/lib/actions/customer-actions";
import type { AppLocale } from "@/i18n/routing";
import type { Order, Customer } from "@prisma/client";

type OrdersPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function OrdersPage({ params }: OrdersPageProps) {
  const { locale } = (await params) as { locale: AppLocale };
  setRequestLocale(locale);
  const { admin, navigation, shell } = await getAdminLocaleContent(locale);

  const [orders, customers] = await Promise.all([getOrders(), getCustomers()]);

  const initialOrders: OrderItem[] = (orders as any[]).map(
    (o: any): OrderItem => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customer.name,
      amount: o.amount,
      status: o.status,
    }),
  );

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
        <OrderKanban
          initialOrders={initialOrders}
          customers={customers.map((c: Customer) => ({ id: c.id, name: c.name }))}
          messages={admin.orders.orderManager}
        />
      )}
    </AdminPageView>
  );
}
