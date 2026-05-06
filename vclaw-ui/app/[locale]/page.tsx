import { getMessages, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  LandingPage,
  type LandingContent,
} from "@/components/marketing/landing-page";
import { locales, getLocaleHref } from "@/i18n/routing";
import type { AppLocale } from "@/i18n/routing";
import { DesktopRedirect } from "@/components/app/desktop-redirect";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type HomePageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ landing?: string }>;
};

export default async function HomePage({ params, searchParams }: HomePageProps) {
  const { locale } = (await params) as { locale: AppLocale };
  const { landing } = await searchParams;
  
  setRequestLocale(locale);

  // Chuyển hướng ngay trên server nếu là bản desktop để UX mượt mà, không bị nháy
  if (process.env.NEXT_PUBLIC_IS_DESKTOP === "true" && landing !== "true") {
    redirect(getLocaleHref(locale, "/admin"));
  }

  const messages = await getMessages({ locale });

  return (
    <>
      <Suspense fallback={null}>
        <DesktopRedirect locale={locale} />
      </Suspense>
      <LandingPage
        locale={locale}
        content={messages.landing as LandingContent}
      />
    </>
  );
}
