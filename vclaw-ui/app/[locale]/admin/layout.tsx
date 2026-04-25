import { setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import type { AppLocale } from "@/i18n/routing";

/** Tránh prerender lúc build (Vercel/CI thường không có SQLite đã migrate). */
export const dynamic = "force-dynamic";

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
