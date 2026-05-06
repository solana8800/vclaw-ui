import LocaleAdminOverviewPage from "@/app/[locale]/admin/page";

export default function DefaultAdminOverviewPage() {
  return <LocaleAdminOverviewPage params={Promise.resolve({ locale: "vi" })} searchParams={Promise.resolve({})} />;
}
