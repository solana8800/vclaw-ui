"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

import { getLocaleHref, locales, type AppLocale } from "@/i18n/routing";

type LanguageSwitcherProps = {
  locale: AppLocale;
};

function toCanonicalPath(pathname: string): string {
  // Loại bỏ bất kỳ locale nào có trong danh sách ra khỏi pathname
  for (const l of locales) {
    if (pathname === `/${l}` || pathname === `/${l}/`) {
      return "/";
    }
    if (pathname.startsWith(`/${l}/`)) {
      return pathname.slice(`/${l}`.length);
    }
  }

  return pathname;
}

export function LanguageSwitcher({ locale }: LanguageSwitcherProps) {
  const t = useTranslations("common.language");
  const pathname = usePathname() ?? "/";
  const canonicalPath = toCanonicalPath(pathname);

  const nextLocale = locale === "vi" ? "en" : "vi";

  return (
    <Link
      href={getLocaleHref(nextLocale, canonicalPath)}
      className="inline-flex h-8 items-center justify-center rounded-full border border-[color:var(--line-strong)] bg-[color:var(--surface-glass)] px-3 text-xs font-bold uppercase tracking-[0.2em] text-[color:var(--foreground-strong)] shadow-[0_12px_30px_-24px_var(--shadow-color)] backdrop-blur transition hover:border-[color:var(--brand)] hover:bg-[color:var(--brand-softer)] sm:h-9"
      aria-label={t("switch_to", { locale: nextLocale.toUpperCase() })}
    >
      {nextLocale}
    </Link>
  );
}
