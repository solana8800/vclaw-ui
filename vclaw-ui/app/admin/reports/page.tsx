import LocaleReportsPage from "@/app/[locale]/admin/reports/page";

export default function DefaultReportsPage() {
  return <LocaleReportsPage params={Promise.resolve({ locale: "vi" })} />;
}
