"use client";

import { MoonStar, SunMedium } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";

import {
  applyThemeToDocument,
  defaultTheme,
  readThemeFromDocument,
  themeChangeEventName,
  themeStorageKey,
  type ThemeName,
} from "@/lib/ui";

function subscribe(onStoreChange: () => void) {
  window.addEventListener(themeChangeEventName, onStoreChange);
  return () => window.removeEventListener(themeChangeEventName, onStoreChange);
}

function getThemeSnapshot() {
  if (typeof document === "undefined") {
    return defaultTheme;
  }

  return readThemeFromDocument();
}

export function ThemeToggle() {
  const t = useTranslations("common.theme");
  const theme = useSyncExternalStore(subscribe, getThemeSnapshot, () => defaultTheme);
  const nextTheme: ThemeName = theme === "light" ? "dark" : "light";
  const Icon = theme === "light" ? MoonStar : SunMedium;

  function setDocumentTheme(nextTheme: ThemeName) {
    applyThemeToDocument(nextTheme);
    window.localStorage.setItem(themeStorageKey, nextTheme);
    window.dispatchEvent(new Event(themeChangeEventName));
  }

  return (
    <button
      type="button"
      aria-label={t(nextTheme)}
      title={t(nextTheme)}
      onClick={() => setDocumentTheme(nextTheme)}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--line-strong)] bg-[color:var(--surface-glass)] text-[color:var(--foreground-strong)] shadow-[0_12px_30px_-24px_var(--shadow-color)] backdrop-blur transition hover:border-[color:var(--brand)] hover:bg-[color:var(--brand-softer)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)]"
    >
      <Icon className="h-4 w-4" />
      <span className="sr-only">{t("helper")}</span>
    </button>
  );
}
