import { getTranslations, setRequestLocale } from "next-intl/server";

import { LegalLayout, LegalSection } from "@/components/marketing/legal-layout";
import type { AppLocale } from "@/i18n/routing";

type TermsPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: TermsPageProps) {
  const { locale } = (await params) as { locale: AppLocale };
  const t = await getTranslations({ locale, namespace: "legal.terms" });

  return {
    title: `${t("title")} | VClaw`,
  };
}

export default async function TermsPage({ params }: TermsPageProps) {
  const { locale } = (await params) as { locale: AppLocale };
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "legal.terms" });

  const date = new Date().toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <LegalLayout
      title={t("title")}
      lastUpdated={t("lastUpdated", { date })}
      introduction={t("introduction")}
    >
      <LegalSection
        title={t("sections.acceptance.title")}
        content={t("sections.acceptance.content")}
      />
      <LegalSection
        title={t("sections.license.title")}
        content={t("sections.license.content")}
        items={t.raw("sections.license.items")}
      />
      <LegalSection
        title={t("sections.liability.title")}
        content={t("sections.liability.content")}
      />
      <LegalSection
        title={t("sections.termination.title")}
        content={t("sections.termination.content")}
      />
      <LegalSection
        title={t("sections.governing.title")}
        content={t("sections.governing.content")}
      />
    </LegalLayout>
  );
}
