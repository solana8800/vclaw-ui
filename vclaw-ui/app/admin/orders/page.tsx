import LocaleOrdersPage from "@/app/[locale]/admin/orders/page";

export default function DefaultOrdersPage() {
  return <LocaleOrdersPage params={Promise.resolve({ locale: "vi" })} searchParams={Promise.resolve({})} />;
}
