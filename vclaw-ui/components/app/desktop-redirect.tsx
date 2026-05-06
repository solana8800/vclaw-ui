"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useIsDesktop } from "@/lib/hooks/use-is-desktop";
import { getLocaleHref } from "@/i18n/routing";
import type { AppLocale } from "@/i18n/routing";

export function DesktopRedirect({ locale }: { locale: AppLocale }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDesktop = useIsDesktop();
  const isLandingForced = searchParams.get("landing") === "true";

  useEffect(() => {
    // Nếu là môi trường Desktop và không yêu cầu xem landing page (qua logo click)
    // thì chuyển thẳng vào Bảng điều khiển (Admin)
    if (isDesktop && !isLandingForced) {
      const adminHref = getLocaleHref(locale, "/admin");
      router.replace(adminHref);
    }
  }, [isDesktop, isLandingForced, locale, router]);

  return null;
}
