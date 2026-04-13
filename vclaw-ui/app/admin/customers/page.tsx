import LocaleCustomersPage from "@/app/[locale]/admin/customers/page";

export default function DefaultCustomersPage() {
  return <LocaleCustomersPage params={Promise.resolve({ locale: "vi" })} />;
}
