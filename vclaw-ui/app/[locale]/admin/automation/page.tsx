import { redirect } from "next/navigation";
import { getAdminPath } from "@/lib/admin/content";
import type { AppLocale } from "@/i18n/routing";

export default async function AutomationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = (await params) as { locale: AppLocale };
  redirect(getAdminPath(locale, "/admin/zalouser") + "?tab=automation");
  return null as never;
}
