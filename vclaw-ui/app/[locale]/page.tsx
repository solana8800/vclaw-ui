import { getMessages, setRequestLocale } from "next-intl/server";

import {
  LandingPage,
  type LandingContent,
} from "@/components/marketing/landing-page";
import { locales } from "@/i18n/routing";
import type { AppLocale } from "@/i18n/routing";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = (await params) as { locale: AppLocale };
  setRequestLocale(locale);
  const messages = await getMessages({ locale });

  return (
    <LandingPage
      locale={locale}
      content={messages.landing as LandingContent}
    />
  );
}
