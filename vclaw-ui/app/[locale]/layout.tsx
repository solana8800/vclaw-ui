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
  const title = t("metadata.title");
  const description = t("metadata.description");
  const isVi = locale === "vi";

  return {
    title: {
      default: title,
      template: `%s | VClaw`,
    },
    description,
    keywords: isVi
      ? [
          "phần mềm bán hàng online AI",
          "ứng dụng quản lý đơn hàng Zalo Shopee",
          "AI hỗ trợ bán hàng Mac",
          "VClaw",
          "app bán hàng macOS",
          "quản lý đơn hàng TikTok Shop",
          "AI soạn tin nhắn bán hàng",
          "phần mềm quản lý shop online",
          "VietQR thanh toán tự động",
        ]
      : [
          "AI online selling app",
          "Zalo Shopee order management",
          "Mac AI sales assistant",
          "VClaw",
          "macOS selling software",
          "TikTok Shop order tracking",
          "AI reply drafting for sellers",
          "online shop management tool",
        ],
    authors: [{ name: "VClaw" }],
    creator: "VClaw",
    metadataBase: new URL("https://vclaw.app"),
    openGraph: {
      title,
      description,
      type: "website",
      locale: isVi ? "vi_VN" : "en_US",
      siteName: "VClaw",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-snippet": -1,
        "max-image-preview": "large",
        "max-video-preview": -1,
      },
    },
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
