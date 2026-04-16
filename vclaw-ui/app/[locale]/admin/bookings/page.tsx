import { setRequestLocale } from "next-intl/server";
import { AdminPageView } from "@/components/admin/admin-page-view";
import { BookingManager } from "@/components/admin/booking-manager";
import { getAdminPath } from "@/lib/admin-content";
import { getAdminLocaleContent } from "@/lib/admin-runtime";
import type { AppLocale } from "@/i18n/routing";

type BookingsPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function BookingsPage({ params }: BookingsPageProps) {
  const { locale } = (await params) as { locale: AppLocale };
  setRequestLocale(locale);
  const { admin, navigation, shell } = await getAdminLocaleContent(locale);

  return (
    <AdminPageView
      navigation={navigation}
      currentPath={getAdminPath(locale, "/admin/bookings")}
      shell={shell}
      content={admin.bookings}
      workflowCtaHref={getAdminPath(locale, "/admin/integrations")}
      nextStepHref={getAdminPath(locale, "/admin/integrations")}
    >
      {admin.bookings.bookingManager && (
        <BookingManager messages={admin.bookings.bookingManager} />
      )}
    </AdminPageView>
  );
}
