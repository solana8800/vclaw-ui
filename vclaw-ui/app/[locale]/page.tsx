import { getMessages, setRequestLocale } from "next-intl/server";

import {
  LandingPage,
  type LandingContent,
} from "@/components/marketing/landing-page";
import type { AppLocale } from "@/i18n/routing";

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
