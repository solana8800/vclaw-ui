"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

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

function SwitcherInner({ locale }: LanguageSwitcherProps) {
  const t = useTranslations("common.language");
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const canonicalPath = toCanonicalPath(pathname);

  const nextLocale = locale === "vi" ? "en" : "vi";

  let href = getLocaleHref(nextLocale, canonicalPath);
  const searchString = searchParams?.toString();
  if (searchString) {
    href += `?${searchString}`;
  }

  return (
    <Link
      href={href}
      className="inline-flex h-8 items-center justify-center rounded-full border border-[color:var(--line-strong)] bg-[color:var(--surface-glass)] px-3 text-xs font-bold uppercase tracking-[0.2em] text-[color:var(--foreground-strong)] shadow-[0_12px_30px_-24px_var(--shadow-color)] backdrop-blur transition hover:border-[color:var(--brand)] hover:bg-[color:var(--brand-softer)] sm:h-9"
      aria-label={t("switch_to", { locale: nextLocale.toUpperCase() })}
    >
      {nextLocale}
    </Link>
  );
}

export function LanguageSwitcher({ locale }: LanguageSwitcherProps) {
  return (
    <Suspense fallback={<div className="inline-flex h-8 w-[42px] rounded-full border border-[color:var(--line-strong)] bg-[color:var(--surface-glass)] sm:h-9"></div>}>
      <SwitcherInner locale={locale} />
    </Suspense>
  );
}
