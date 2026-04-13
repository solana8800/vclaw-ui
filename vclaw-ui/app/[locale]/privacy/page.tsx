import { getTranslations, setRequestLocale } from "next-intl/server";

import { LegalLayout, LegalSection } from "@/components/marketing/legal-layout";
import type { AppLocale } from "@/i18n/routing";

type PrivacyPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PrivacyPageProps) {
  const { locale } = (await params) as { locale: AppLocale };
  const t = await getTranslations({ locale, namespace: "legal.privacy" });

  return {
    title: `${t("title")} | VClaw`,
  };
}

export default async function PrivacyPage({ params }: PrivacyPageProps) {
  const { locale } = (await params) as { locale: AppLocale };
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "legal.privacy" });

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
        title={t("sections.collection.title")}
        content={t("sections.collection.content")}
        items={t.raw("sections.collection.items")}
      />
      <LegalSection
        title={t("sections.usage.title")}
        content={t("sections.usage.content")}
        items={t.raw("sections.usage.items")}
      />
      <LegalSection
        title={t("sections.sharing.title")}
        content={t("sections.sharing.content")}
      />
      <LegalSection
        title={t("sections.security.title")}
        content={t("sections.security.content")}
        items={t.raw("sections.security.items")}
      />
      <LegalSection
        title={t("sections.rights.title")}
        content={t("sections.rights.content")}
      />
    </LegalLayout>
  );
}
