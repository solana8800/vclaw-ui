import { defineRouting } from "next-intl/routing";

export const locales = ["vi", "en"] as const;
export type AppLocale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "vi",
  // "always": every locale has a URL prefix (/vi/…, /en/…). Required for Next.js 16
  // standalone: with "as-needed", the root "/" proxy (i18n) rewrite targets http://localhost:<port>/vi
  // while the client may use 127.0.0.1, which becomes a self-redirect loop (ERR_TOO_MANY_REDIRECTS).
  localePrefix: "always",
  localeDetection: false,
});

export function isSupportedLocale(value: string): value is AppLocale {
  return locales.includes(value as AppLocale);
}

/** Strip locale prefix so we can re-prefix for the target locale. */
function toCanonicalPathname(pathname: string): string {
  let p = pathname.startsWith("/") ? pathname : `/${pathname}`;
  p = p.replace(/\/+$/, "") || "/";

  if (p === "/vi" || p === "/en") {
    return "/";
  }
  if (p.startsWith("/vi/")) {
    const rest = p.slice("/vi".length);
    return rest === "" ? "/" : rest;
  }
  if (p.startsWith("/en/")) {
    const rest = p.slice("/en".length);
    return rest === "" ? "/" : rest;
  }
  return p;
}

export function getLocaleHref(locale: AppLocale, pathname: string): string {
  const canonical = toCanonicalPathname(pathname);
  const prefix = locale === "vi" ? "/vi" : "/en";
  if (canonical === "/") {
    return prefix;
  }
  return `${prefix}${canonical}`;
}
