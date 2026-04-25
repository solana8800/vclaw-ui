import { setRequestLocale } from "next-intl/server";
import { AdminPageView } from "@/components/admin/admin-page-view";
import { BillVerificationManager } from "@/components/admin/bill-verification-manager";
import { PaymentListManager } from "@/components/admin/payment-list-manager";
import { getAdminPath } from "@/lib/admin/content";
import { getAdminLocaleContent } from "@/lib/admin/runtime";
import { getPaymentTasks } from "@/lib/commerce/payments";
import { getPaymentsWithOrders } from "@/lib/actions/payment-actions";
import { getShopSettings } from "@/lib/actions/shop-settings-actions";
import { BankSettings } from "@/components/admin/bank-settings";
import type { AppLocale } from "@/i18n/routing";

type PaymentsPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function PaymentsPage({ params }: PaymentsPageProps) {
  const { locale } = (await params) as { locale: AppLocale };
  setRequestLocale(locale);
  const { admin, navigation, shell } = await getAdminLocaleContent(locale);

  const [tasks, payments, settings] = await Promise.all([
    getPaymentTasks(),
    getPaymentsWithOrders(),
    getShopSettings(),
  ]);

  return (
    <AdminPageView
      navigation={navigation}
      currentPath={getAdminPath(locale, "/admin/payments")}
      shell={shell}
      content={admin.payments}
      workflowCtaHref={getAdminPath(locale, "/admin/bookings")}
      nextStepHref={getAdminPath(locale, "/admin/bookings")}
    >
      <BankSettings initialSettings={settings} />
      
      {admin.payments.paymentList ? (
        <PaymentListManager initialPayments={payments} messages={admin.payments.paymentList} />
      ) : null}
      {admin.payments.paymentManager ? (
        <BillVerificationManager
          tasks={tasks.map((t) => ({
            id: t.id,
            title: t.title,
            subtitle: t.subtitle,
            amount: t.amount,
            timeAgo: t.timeAgo,
          }))}
          messages={{
            ...admin.payments.paymentManager,
            listTitle: admin.payments.paymentManager.listTitle,
          }}
        />
      ) : null}
    </AdminPageView>
  );
}
