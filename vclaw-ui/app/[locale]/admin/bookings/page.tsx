import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { AdminPageView } from "@/components/admin/admin-page-view";
import { BookingManager } from "@/components/admin/booking-manager";
import { getAdminPath } from "@/lib/admin/content";
import { getAdminLocaleContent } from "@/lib/admin/runtime";
import { getBookingsForDate } from "@/lib/actions/booking-actions";
import { getCustomers } from "@/lib/actions/customer-actions";
import type { AppLocale } from "@/i18n/routing";

type CustomerListItem = Awaited<ReturnType<typeof getCustomers>>[number];

type BookingsPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ date?: string }>;
};

function validDate(value: string | undefined) {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return new Date().toISOString().split("T")[0];
}

export default async function BookingsPage({ params, searchParams }: BookingsPageProps) {
  const { locale } = (await params) as { locale: AppLocale };
  setRequestLocale(locale);
  const { admin, navigation, shell } = await getAdminLocaleContent(locale);

  const sp = await searchParams;
  const dateStr = validDate(sp.date);

  const [bookings, customers] = await Promise.all([
    getBookingsForDate(dateStr),
    getCustomers(),
  ]);

  return (
    <AdminPageView
      navigation={navigation}
      currentPath={getAdminPath(locale, "/admin/bookings")}
      shell={shell}
      content={admin.bookings}
      workflowCtaHref={getAdminPath(locale, "/admin/settings")}
      nextStepHref={getAdminPath(locale, "/admin/settings")}
    >
      {admin.bookings.bookingManager ? (
        <Suspense
          fallback={<div className="mt-6 text-sm text-[color:var(--muted)]">Đang tải lịch…</div>}
        >
          <BookingManager
            messages={admin.bookings.bookingManager}
            initialBookings={bookings}
            customers={customers.map((c: CustomerListItem) => ({ id: c.id, name: c.name }))}
            dateStr={dateStr}
          />
        </Suspense>
      ) : null}
    </AdminPageView>
  );
}
