import { setRequestLocale } from "next-intl/server";
import { AdminPageView } from "@/components/admin/admin-page-view";
import { BillVerificationManager } from "@/components/admin/bill-verification-manager";
import { getAdminPath } from "@/lib/admin-content";
import { getAdminLocaleContent } from "@/lib/admin-runtime";
import type { AppLocale } from "@/i18n/routing";

type PaymentsPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function PaymentsPage({ params }: PaymentsPageProps) {
  const { locale } = (await params) as { locale: AppLocale };
  setRequestLocale(locale);
  const { admin, navigation, shell } = await getAdminLocaleContent(locale);

  return (
    <AdminPageView
      navigation={navigation}
      currentPath={getAdminPath(locale, "/admin/payments")}
      shell={shell}
      content={admin.payments}
      workflowCtaHref={getAdminPath(locale, "/admin/bookings")}
      nextStepHref={getAdminPath(locale, "/admin/bookings")}
    >
      {admin.payments.paymentManager && (
        <BillVerificationManager messages={admin.payments.paymentManager} />
      )}
    </AdminPageView>
  );
}
