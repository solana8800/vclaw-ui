import LocaleTermsPage from "@/app/[locale]/terms/page";
import type { AppLocale } from "@/i18n/routing";

export default function DefaultTermsPage() {
  const params = Promise.resolve({ locale: "vi" as AppLocale });
  return <LocaleTermsPage params={params} />;
}
