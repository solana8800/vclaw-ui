import LocaleBookingsPage from "@/app/[locale]/admin/bookings/page";

export default function DefaultBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  return (
    <LocaleBookingsPage
      params={Promise.resolve({ locale: "vi" })}
      searchParams={searchParams}
    />
  );
}
