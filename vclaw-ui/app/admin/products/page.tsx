import LocaleProductsPage from "@/app/[locale]/admin/products/page";

export default function DefaultProductsPage() {
  return <LocaleProductsPage params={Promise.resolve({ locale: "vi" })} />;
}
