import LocalePaymentsPage from "@/app/[locale]/admin/payments/page";

export default function DefaultPaymentsPage() {
  return <LocalePaymentsPage params={Promise.resolve({ locale: "vi" })} />;
}
