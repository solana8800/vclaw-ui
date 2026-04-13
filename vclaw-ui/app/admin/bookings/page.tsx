import LocaleBookingsPage from "@/app/[locale]/admin/bookings/page";

export default function DefaultBookingsPage() {
  return <LocaleBookingsPage params={Promise.resolve({ locale: "vi" })} />;
}
