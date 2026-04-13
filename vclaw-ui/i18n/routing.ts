import { defineRouting } from "next-intl/routing";

export const locales = ["vi", "en"] as const;
export type AppLocale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "vi",
  localePrefix: "as-needed",
  localeDetection: false,
});

export function isSupportedLocale(value: string): value is AppLocale {
  return locales.includes(value as AppLocale);
}

/** Map a pathname to its default-locale (unprefixed) form; only strips `/en` as a segment. */
function toCanonicalPathname(pathname: string): string {
  if (pathname === "/en" || pathname === "/en/") {
    return "/";
  }
  if (pathname.startsWith("/en/")) {
    return pathname.slice("/en".length);
  }
  return pathname;
}

export function getLocaleHref(locale: AppLocale, pathname: string): string {
  const canonical = toCanonicalPathname(pathname);

  if (locale === "vi") {
    return canonical === "/" ? "/" : canonical;
  }

  if (canonical === "/") {
    return "/en";
  }
  return `/en${canonical}`;
}
