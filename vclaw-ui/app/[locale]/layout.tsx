import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { LocaleShell } from "@/components/app/locale-shell";
import { setRequestLocale } from "next-intl/server";
import { locales, type AppLocale } from "@/i18n/routing";

type LocaleLayoutProps = Readonly<{
  children: ReactNode;
  params: Promise<{ locale: string }>;
}>;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: Omit<LocaleLayoutProps, "children">): Promise<Metadata> {
  const { locale } = await params;

  if (!hasLocale(locales, locale)) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: "common" });

  return {
    title: t("metadata.title"),
    description: t("metadata.description"),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!hasLocale(locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <LocaleShell locale={locale as AppLocale}>{children}</LocaleShell>
  );
}
