import { getRequestConfig } from "next-intl/server";

import { isSupportedLocale } from "@/i18n/routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale =
    requested && isSupportedLocale(requested) ? requested : "vi";

  return {
    locale,
    messages: {
      common: (await import(`@/messages/${locale}/common.json`)).default,
      navigation: (await import(`@/messages/${locale}/navigation.json`))
        .default,
      landing: (await import(`@/messages/${locale}/landing.json`)).default,
      admin: (await import(`@/messages/${locale}/admin.json`)).default,
      docs: (await import(`@/messages/${locale}/docs.json`)).default,
      legal: (await import(`@/messages/${locale}/legal.json`)).default,
    },
  };
});
