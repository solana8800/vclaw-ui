import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminPageTabs } from "@/components/admin/admin-page-tabs";
import { OrderKanban, type OrderItem } from "@/components/admin/order-kanban";
import { BillVerificationManager } from "@/components/admin/bill-verification-manager";
import { PaymentListManager } from "@/components/admin/payment-list-manager";
import { ShippingCarriersStatus } from "@/components/admin/shipping-carriers-status";
import { ShippingManager } from "@/components/admin/shipping-manager";
import { ShippingList } from "@/components/admin/shipping-list";
import { TaskInboxManager } from "@/components/admin/task-inbox-manager";
import { WorkflowCard } from "@/components/admin/admin-shell";
import { getAdminPath } from "@/lib/admin/content";
import { getAdminLocaleContent } from "@/lib/admin/runtime";
import { getOrders } from "@/lib/commerce/orders";
import { getCustomers } from "@/lib/actions/customer-actions";
import { getPaymentTasks } from "@/lib/commerce/payments";
import { getPaymentsWithOrders } from "@/lib/actions/payment-actions";
import { getShopSettings } from "@/lib/actions/shop-settings-actions";
import { getTasks } from "@/lib/commerce/tasks";
import { getChannelNotifications } from "@/lib/commerce/channel-notifications";
import { ChannelNotificationManager } from "@/components/admin/channel-notification-manager";
import { AdminPagination } from "@/components/admin/admin-pagination";
import type { AppLocale } from "@/i18n/routing";
import type { Customer, Task } from "@prisma/client";

type OrdersPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string; page?: string }>;
};

export default async function OrdersPage({ params, searchParams }: OrdersPageProps) {
  const { locale } = (await params) as { locale: AppLocale };
  const sp = await searchParams;
  const currentPage = Number(sp.page) || 1;
  const activeTab = sp.tab || "orders";

  setRequestLocale(locale);
  const { admin, navigation, shell, workspaceLabels } = await getAdminLocaleContent(locale);
  const nav = admin.navigation;

  const [
    { data: ordersData, totalPages: orderTotalPages },
    { data: customersData, totalPages: customerTotalPages },
    paymentTasks,
    { data: paymentsData, totalPages: paymentTotalPages },
    shopRow,
    dbTasks,
    { data: channelNotifications, totalPages: notificationTotalPages }
  ] = await Promise.all([
    getOrders(currentPage, 50),
    getCustomers(1, 1000), 
    getPaymentTasks(),
    getPaymentsWithOrders(currentPage, 50),
    getShopSettings(),
    getTasks(),
    getChannelNotifications(currentPage, 20),
  ]);

  const taskRows = dbTasks.map((t: Task) => ({
    id: t.id,
    type: t.type,
    title: t.title,
    subtitle: t.subtitle ?? "",
    amount: t.amount,
    timeAgo: t.timeAgo,
    isUrgent: t.isUrgent,
  }));

  const initialOrders: OrderItem[] = ordersData.map(
    (o: any): OrderItem => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customerName:
        o.customer?.name ||
        admin.orders.orderManager?.unknownCustomer ||
        "Unknown customer",
      amount: o.amount,
      status: o.status,
      fulfillmentStatus: o.fulfillmentStatus,
      fulfillmentType: o.fulfillmentType,
      updatedAt: o.updatedAt?.toISOString?.() ?? undefined,
      createdAt: o.createdAt?.toISOString?.() ?? undefined,
      items: o.items || [],
      shippingAddress: o.shippingAddress || undefined,
      shippingNote: o.shippingNote || undefined,
      trackingNumber: o.trackingNumber || undefined,
      payments: o.payments || [],
      customer: o.customer
        ? {
            id: o.customer.id,
            name: o.customer.name,
            phone: (o.customer as any).phone ?? null,
            email: (o.customer as any).email ?? null,
            shippingAddress: (o.customer as any).shippingAddress ?? null,
          }
        : null,
    }),
  );

  const ghnConfigured = Boolean(
    (shopRow?.ghnToken ?? "").trim() && (shopRow?.ghnShopId ?? "").trim(),
  );
  const pendingFulfillment = ordersData.filter(
    (o: any) => o.fulfillmentStatus === "PENDING",
  );

  const shippingContent = admin.shipping;
  const shippingManager = {
    ...shippingContent?.manager,
    title: shippingContent?.manager?.title ?? shippingContent?.title ?? "",
    description: shippingContent?.manager?.description ?? shippingContent?.description ?? "",
  };

  const tabs = [
    {
      id: "orders",
      label: nav?.tab_orders || "Orders",
      children: (
        <div className="space-y-6">
          {admin.inbox.inboxManager && (
            <TaskInboxManager
              key={dbTasks.map((t: Task) => `${t.id}:${t.updatedAt.toISOString()}`).join("|")}
              messages={admin.inbox.inboxManager}
              initialTasks={taskRows}
            />
          )}
          {admin.orders.orderManager && (
            <div className="space-y-4">
              <OrderKanban
                initialOrders={initialOrders}
                customers={customersData.map((c: Customer) => ({ id: c.id, name: c.name }))}
                messages={admin.orders.orderManager}
              />
              <AdminPagination
                currentPage={currentPage}
                totalPages={orderTotalPages}
                baseUrl={getAdminPath(locale, "/admin/orders?tab=orders")}
              />
            </div>
          )}
        </div>
      ),
    },
    {
      id: "payments",
      label: nav?.tab_payments || "Payments",
      children: (
        <div className="space-y-6">
          {admin.payments.paymentList ? (
            <div className="space-y-4">
              <PaymentListManager
                initialPayments={paymentsData}
                messages={admin.payments.paymentList}
              />
              <AdminPagination
                currentPage={currentPage}
                totalPages={paymentTotalPages}
                baseUrl={getAdminPath(locale, "/admin/orders?tab=payments")}
              />
            </div>
          ) : null}
          {admin.payments.paymentManager ? (
            <BillVerificationManager
              payments={paymentsData}
              tasks={paymentTasks.map((t: any) => ({
                id: t.id,
                title: t.title,
                subtitle: t.subtitle,
                amount: t.amount,
                timeAgo: t.timeAgo,
              }))}
              messages={{ ...admin.payments.paymentManager }}
            />
          ) : null}
          
          <div className="space-y-4">
            <ChannelNotificationManager notifications={channelNotifications} />
            <AdminPagination
              currentPage={currentPage}
              totalPages={notificationTotalPages}
              baseUrl={getAdminPath(locale, "/admin/orders?tab=payments")}
            />
          </div>
        </div>
      ),
    },
    {
      id: "shipping",
      label: nav?.tab_shipping || "Shipping",
      children: shippingContent ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Cột chính: Danh sách và Công cụ */}
          <div className="lg:col-span-8 space-y-6">
            <ShippingList
              orders={pendingFulfillment}
              shipperGroupId={shopRow?.shipperGroupId || undefined}
            />
            <ShippingManager messages={shippingManager} />
          </div>

          {/* Cột phụ: Trạng thái và Hướng dẫn */}
          <div className="lg:col-span-4 space-y-6">
            <ShippingCarriersStatus
              locale={locale}
              ghnConfigured={ghnConfigured}
            />
            <WorkflowCard
              title={shippingContent.workflow.title}
              description={shell.workflowDescription}
              steps={shippingContent.workflow.steps}
            />
          </div>
        </div>
      ) : (
        <div />
      ),
    },
  ];

  return (
    <AdminShell
      navigation={navigation}
      currentPath={getAdminPath(locale, "/admin/orders")}
      title={admin.orders.title}
      description={admin.orders.description}
      badge={shell.badge}
      sidebarTitle={shell.sidebarTitle}
      sidebarDescription={shell.sidebarDescription}
      workspaceLabels={workspaceLabels}
    >
      <Suspense>
        <AdminPageTabs tabs={tabs} defaultTab="orders" />
      </Suspense>
    </AdminShell>
  );
}
