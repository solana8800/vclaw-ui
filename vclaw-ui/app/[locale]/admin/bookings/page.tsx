import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { AdminPageView } from "@/components/admin/admin-page-view";
import { BookingManager } from "@/components/admin/booking-manager";
import { getAdminPath } from "@/lib/admin/content";
import { getAdminLocaleContent } from "@/lib/admin/runtime";
import { getBookingsForDate } from "@/lib/actions/booking-actions";
import { getCustomers } from "@/lib/actions/customer-actions";
import { BookingTaskManager } from "@/components/admin/booking-task-manager";
import { prisma } from "@/lib/db";
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
  const bm = admin.bookings.bookingManager;

  const sp = await searchParams;
  const dateStr = validDate(sp.date);

  const [bookings, customers, tasks] = await Promise.all([
    getBookingsForDate(dateStr),
    getCustomers(),
    prisma.task.findMany({
      where: { type: "BOOKING_CONFIRM", status: "NEW" },
      orderBy: { createdAt: "desc" }
    })
  ]);

  return (
    <AdminPageView
      navigation={navigation}
      currentPath={getAdminPath(locale, "/admin/bookings")}
      shell={shell}
      content={admin.bookings}
      workflowCtaHref={getAdminPath(locale, "/admin/settings")}
      nextStepHref={getAdminPath(locale, "/admin/settings")}
      hideList={true}
      liveItems={bookings.map((b) => ({
        title: `${new Date(b.startTime).toLocaleTimeString(locale === "en" ? "en-US" : "vi-VN", { hour: "2-digit", minute: "2-digit" })} · ${b.customer.name}`,
        subtitle: b.serviceName,
        badge:
          b.status === "CONFIRMED"
            ? (bm?.statusConfirmed ?? "Confirmed")
            : b.status === "PENDING"
              ? (bm?.statusPending ?? "Pending")
              : b.status === "CANCELLED"
                ? (bm?.statusCancelled ?? "Cancelled")
                : b.status === "COMPLETED"
                  ? (bm?.statusCompleted ?? "Completed")
                  : b.status,
      }))}
    >
      <BookingTaskManager tasks={tasks} messages={admin.bookings.bookingManager} />

      {admin.bookings.bookingManager ? (
        <Suspense
          fallback={
            <div className="mt-6 text-sm text-[color:var(--muted)]">
              {bm?.pageLoading ?? "Loading…"}
            </div>
          }
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
