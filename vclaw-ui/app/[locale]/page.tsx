import { getMessages, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Script from "next/script";
import {
  LandingPage,
  type LandingContent,
} from "@/components/marketing/landing-page";
import { locales, getLocaleHref } from "@/i18n/routing";
import type { AppLocale } from "@/i18n/routing";
import { DesktopRedirect } from "@/components/app/desktop-redirect";
import { INSTALLER_DOWNLOAD_URLS } from "@/lib/release/download-urls";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type HomePageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ landing?: string }>;
};

export default async function HomePage({ params, searchParams }: HomePageProps) {
  const { locale } = (await params) as { locale: AppLocale };
  const { landing: landingParam } = await searchParams;

  setRequestLocale(locale);

  // Chuyển hướng ngay trên server nếu là bản desktop để UX mượt mà, không bị nháy
  if (process.env.NEXT_PUBLIC_IS_DESKTOP === "true" && landingParam !== "true") {
    redirect(getLocaleHref(locale, "/admin"));
  }

  const messages = await getMessages({ locale });
  const landing = messages.landing as LandingContent;

  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "VClaw",
    applicationCategory: "BusinessApplication",
    operatingSystem: "macOS 13+, Windows 10/11, Ubuntu/Debian",
    offers: { "@type": "Offer", price: "0", priceCurrency: "VND" },
    description: landing.commerce.hero.description,
    downloadUrl: INSTALLER_DOWNLOAD_URLS.macos,
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: landing.faq.items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <>
      <Script
        id="ld-software"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />
      <Script
        id="ld-faq"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Suspense fallback={null}>
        <DesktopRedirect locale={locale} />
      </Suspense>
      <LandingPage locale={locale} content={landing} />
    </>
  );
}
