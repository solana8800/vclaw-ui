import LocalePrivacyPage from "@/app/[locale]/privacy/page";
import type { AppLocale } from "@/i18n/routing";

export default function DefaultPrivacyPage() {
  const params = Promise.resolve({ locale: "vi" as AppLocale });
  return <LocalePrivacyPage params={params} />;
}
