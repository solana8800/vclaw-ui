import LocaleShippingPage from "@/app/[locale]/admin/shipping/page";

export default function DefaultShippingPage() {
  return <LocaleShippingPage params={Promise.resolve({ locale: "vi" })} />;
}
