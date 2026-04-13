import { setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import type { AppLocale } from "@/i18n/routing";

type AdminLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AdminLayout({
  children,
  params,
}: AdminLayoutProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return children;
}
