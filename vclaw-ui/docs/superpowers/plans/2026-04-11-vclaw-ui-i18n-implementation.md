# VClaw UI I18n Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `vclaw-ui` into a bilingual Next.js app with Vietnamese as the default locale at `/`, English at `/en/...`, localized UI chrome across landing/docs/admin, and locale-aware docs loading with explicit English fallback notices.

**Architecture:** Use `next-intl` with `localePrefix: "as-needed"` and `localeDetection: false` so all routes live under `app/[locale]` internally while the public Vietnamese URLs stay unprefixed. Keep markdown docs inside `vclaw-ui/docs`, rename the current source files to `.vi.md`, and extend `lib/docs.ts` to resolve `.en.md` first for English requests before falling back to `.vi.md` with metadata that drives a visible notice.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, `next-intl`, React Markdown, Mermaid, Vitest, Testing Library

---

## File Map

### Dependency and config changes

- Modify: `vclaw-ui/package.json`
- Modify: `vclaw-ui/next.config.ts`
- Create: `vclaw-ui/middleware.ts`
- Create: `vclaw-ui/i18n/routing.ts`
- Create: `vclaw-ui/i18n/request.ts`
- Create: `vclaw-ui/i18n/navigation.ts`

### Locale-aware app shell

- Modify: `vclaw-ui/app/layout.tsx`
- Create: `vclaw-ui/app/[locale]/layout.tsx`
- Create: `vclaw-ui/app/[locale]/page.tsx`
- Create: `vclaw-ui/app/[locale]/docs/[[...slug]]/page.tsx`
- Create: `vclaw-ui/app/[locale]/admin/layout.tsx`
- Create: `vclaw-ui/app/[locale]/admin/page.tsx`
- Create: `vclaw-ui/app/[locale]/admin/onboarding/page.tsx`
- Create: `vclaw-ui/app/[locale]/admin/inbox/page.tsx`
- Create: `vclaw-ui/app/[locale]/admin/customers/page.tsx`
- Create: `vclaw-ui/app/[locale]/admin/orders/page.tsx`
- Create: `vclaw-ui/app/[locale]/admin/payments/page.tsx`
- Create: `vclaw-ui/app/[locale]/admin/bookings/page.tsx`
- Create: `vclaw-ui/app/[locale]/admin/integrations/page.tsx`
- Create: `vclaw-ui/app/[locale]/admin/automation/page.tsx`
- Create: `vclaw-ui/app/[locale]/admin/settings/page.tsx`
- Delete after migration: `vclaw-ui/app/page.tsx`
- Delete after migration: `vclaw-ui/app/docs/[[...slug]]/page.tsx`
- Delete after migration: `vclaw-ui/app/admin/layout.tsx`
- Delete after migration: `vclaw-ui/app/admin/page.tsx`
- Delete after migration: `vclaw-ui/app/admin/onboarding/page.tsx`
- Delete after migration: `vclaw-ui/app/admin/inbox/page.tsx`
- Delete after migration: `vclaw-ui/app/admin/customers/page.tsx`
- Delete after migration: `vclaw-ui/app/admin/orders/page.tsx`
- Delete after migration: `vclaw-ui/app/admin/payments/page.tsx`
- Delete after migration: `vclaw-ui/app/admin/bookings/page.tsx`
- Delete after migration: `vclaw-ui/app/admin/integrations/page.tsx`
- Delete after migration: `vclaw-ui/app/admin/automation/page.tsx`
- Delete after migration: `vclaw-ui/app/admin/settings/page.tsx`

### Shared UI and translation payloads

- Create: `vclaw-ui/components/app/site-header.tsx`
- Create: `vclaw-ui/components/app/language-switcher.tsx`
- Modify: `vclaw-ui/components/marketing/landing-page.tsx`
- Modify: `vclaw-ui/components/admin/admin-shell.tsx`
- Modify: `vclaw-ui/components/docs/docs-layout.tsx`
- Create: `vclaw-ui/messages/vi/common.json`
- Create: `vclaw-ui/messages/vi/navigation.json`
- Create: `vclaw-ui/messages/vi/landing.json`
- Create: `vclaw-ui/messages/vi/admin.json`
- Create: `vclaw-ui/messages/vi/docs.json`
- Create: `vclaw-ui/messages/en/common.json`
- Create: `vclaw-ui/messages/en/navigation.json`
- Create: `vclaw-ui/messages/en/landing.json`
- Create: `vclaw-ui/messages/en/admin.json`
- Create: `vclaw-ui/messages/en/docs.json`

### Locale-aware docs loading

- Modify: `vclaw-ui/lib/docs.ts`
- Modify: `vclaw-ui/lib/docs.test.ts`
- Create: `vclaw-ui/lib/i18n/routing.test.ts`
- Rename: `vclaw-ui/docs/00-Business-Requirements.md` -> `vclaw-ui/docs/00-Business-Requirements.vi.md`
- Rename: `vclaw-ui/docs/01-System-Architecture.md` -> `vclaw-ui/docs/01-System-Architecture.vi.md`
- Rename: `vclaw-ui/docs/05-Implementation-Plan.md` -> `vclaw-ui/docs/05-Implementation-Plan.vi.md`
- Rename: `vclaw-ui/docs/06-OpenClaw-Fork-Technical-Blueprint.md` -> `vclaw-ui/docs/06-OpenClaw-Fork-Technical-Blueprint.vi.md`
- Rename: `vclaw-ui/docs/07-Commerce-Admin-and-Omnichannel-Usecases.md` -> `vclaw-ui/docs/07-Commerce-Admin-and-Omnichannel-Usecases.vi.md`

### Verification

- Run from: `vclaw-ui/`
- Commands:
  - `npm test`
  - `npm run lint`
  - `npm run build`

---

### Task 1: Add locale infrastructure and route mapping

**Files:**
- Modify: `vclaw-ui/package.json`
- Modify: `vclaw-ui/next.config.ts`
- Create: `vclaw-ui/middleware.ts`
- Create: `vclaw-ui/i18n/routing.ts`
- Create: `vclaw-ui/i18n/request.ts`
- Create: `vclaw-ui/i18n/navigation.ts`
- Create: `vclaw-ui/lib/i18n/routing.test.ts`

- [ ] **Step 1: Write the failing route mapping tests**

Create `vclaw-ui/lib/i18n/routing.test.ts` with cases for default Vietnamese URLs, English-prefixed URLs, and locale switching.

```ts
import { describe, expect, it } from "vitest";

import { getLocaleHref, isSupportedLocale } from "@/i18n/routing";

describe("i18n routing", () => {
  it("treats vi as the default locale without a prefix", () => {
    expect(getLocaleHref("vi", "/admin/orders")).toBe("/admin/orders");
    expect(getLocaleHref("vi", "/")).toBe("/");
  });

  it("prefixes english routes with /en", () => {
    expect(getLocaleHref("en", "/admin/orders")).toBe("/en/admin/orders");
    expect(getLocaleHref("en", "/")).toBe("/en");
  });

  it("accepts only configured locales", () => {
    expect(isSupportedLocale("vi")).toBe(true);
    expect(isSupportedLocale("en")).toBe(true);
    expect(isSupportedLocale("fr")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the route mapping test and verify it fails**

Run: `npm test -- lib/i18n/routing.test.ts`
Expected: FAIL because `@/i18n/routing` does not exist yet.

- [ ] **Step 3: Add `next-intl` and wire the app config**

Update `vclaw-ui/package.json` to add the library and keep existing scripts unchanged.

```json
{
  "dependencies": {
    "next-intl": "^4.8.2"
  }
}
```

Update `vclaw-ui/next.config.ts` to wrap the Next config with the `next-intl` plugin.

```ts
import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {};

export default withNextIntl(nextConfig);
```

- [ ] **Step 4: Implement routing helpers, request config, and middleware**

Create `vclaw-ui/i18n/routing.ts`, `vclaw-ui/i18n/navigation.ts`, `vclaw-ui/i18n/request.ts`, and `vclaw-ui/middleware.ts`.

```ts
// vclaw-ui/i18n/routing.ts
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

export function getLocaleHref(locale: AppLocale, pathname: string): string {
  if (locale === "vi") {
    return pathname === "/" ? "/" : pathname;
  }

  return pathname === "/" ? "/en" : `/en${pathname}`;
}
```

```ts
// vclaw-ui/middleware.ts
import createMiddleware from "next-intl/middleware";

import { routing } from "@/i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
```

```ts
// vclaw-ui/i18n/request.ts
import { getRequestConfig } from "next-intl/server";

import { hasLocale } from "next-intl";

import { locales } from "@/i18n/routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(locales, requested) ? requested : "vi";

  return {
    locale,
    messages: {
      common: (await import(`@/messages/${locale}/common.json`)).default,
      navigation: (await import(`@/messages/${locale}/navigation.json`)).default,
      landing: (await import(`@/messages/${locale}/landing.json`)).default,
      admin: (await import(`@/messages/${locale}/admin.json`)).default,
      docs: (await import(`@/messages/${locale}/docs.json`)).default,
    },
  };
});
```

```ts
// vclaw-ui/i18n/navigation.ts
import { createNavigation } from "next-intl/navigation";

import { routing } from "@/i18n/routing";

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
```

- [ ] **Step 5: Re-run the route mapping tests**

Run: `npm test -- lib/i18n/routing.test.ts`
Expected: PASS

- [ ] **Step 6: Install dependencies**

Run: `npm install`
Expected: install completes and `package-lock.json` updates inside `vclaw-ui/`.

---

### Task 2: Move routes under `[locale]` and localize the site shell

**Files:**
- Modify: `vclaw-ui/app/layout.tsx`
- Create: `vclaw-ui/app/[locale]/layout.tsx`
- Create: `vclaw-ui/components/app/site-header.tsx`
- Create: `vclaw-ui/components/app/language-switcher.tsx`
- Create: `vclaw-ui/messages/vi/common.json`
- Create: `vclaw-ui/messages/vi/navigation.json`
- Create: `vclaw-ui/messages/en/common.json`
- Create: `vclaw-ui/messages/en/navigation.json`

- [ ] **Step 1: Convert the root layout into the HTML shell**

Keep `vclaw-ui/app/layout.tsx` responsible for `html`, `body`, and global styles. Read the current locale from the request so `lang` stays correct even though routes live under `app/[locale]`.

```tsx
import { getLocale } from "next-intl/server";
import type { ReactNode } from "react";

import "./globals.css";

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Add the first message dictionaries**

Create navigation and common strings for both locales.

```json
// vclaw-ui/messages/vi/navigation.json
{
  "docs": "Tai lieu",
  "admin": "Quan tri",
  "tagline": "Van hanh thuong mai local-first"
}
```

```json
// vclaw-ui/messages/en/navigation.json
{
  "docs": "Docs",
  "admin": "Admin",
  "tagline": "Local-first commerce operations"
}
```

- [ ] **Step 3: Build the locale layout with provider and metadata**

Create `vclaw-ui/app/[locale]/layout.tsx` that validates the locale, loads messages, and renders the localized site shell.

```tsx
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { locales } from "@/i18n/routing";
import { SiteHeader } from "@/components/app/site-header";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locales, locale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <div className="vclaw-shell">
        <SiteHeader locale={locale} />
        {children}
      </div>
    </NextIntlClientProvider>
  );
}
```

- [ ] **Step 4: Add the header and language switcher**

Create `SiteHeader` and `LanguageSwitcher` components that keep the current route context when changing locales.

```tsx
// vclaw-ui/components/app/language-switcher.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { getLocaleHref, type AppLocale } from "@/i18n/routing";

export function LanguageSwitcher({ locale }: { locale: AppLocale }) {
  const pathname = usePathname() || "/";
  const nextLocale: AppLocale = locale === "vi" ? "en" : "vi";
  const basePath = pathname.replace(/^\/en(?=\/|$)/, "") || "/";

  return <Link href={getLocaleHref(nextLocale, basePath)}>{nextLocale.toUpperCase()}</Link>;
}
```

- [ ] **Step 5: Verify the app still typechecks through the locale layout**

Run: `npm run build`
Expected: the build reaches route compilation and either succeeds or fails only on still-unmigrated pages, not on `next-intl` setup.

---

### Task 3: Make docs loading locale-aware

**Files:**
- Modify: `vclaw-ui/lib/docs.test.ts`
- Modify: `vclaw-ui/lib/docs.ts`
- Rename: `vclaw-ui/docs/00-Business-Requirements.md` -> `vclaw-ui/docs/00-Business-Requirements.vi.md`
- Rename: `vclaw-ui/docs/01-System-Architecture.md` -> `vclaw-ui/docs/01-System-Architecture.vi.md`
- Rename: `vclaw-ui/docs/05-Implementation-Plan.md` -> `vclaw-ui/docs/05-Implementation-Plan.vi.md`
- Rename: `vclaw-ui/docs/06-OpenClaw-Fork-Technical-Blueprint.md` -> `vclaw-ui/docs/06-OpenClaw-Fork-Technical-Blueprint.vi.md`
- Rename: `vclaw-ui/docs/07-Commerce-Admin-and-Omnichannel-Usecases.md` -> `vclaw-ui/docs/07-Commerce-Admin-and-Omnichannel-Usecases.vi.md`

- [ ] **Step 1: Rename the current docs to explicit Vietnamese files**

Run these moves from `vclaw-ui/`:

```bash
mv docs/00-Business-Requirements.md docs/00-Business-Requirements.vi.md
mv docs/01-System-Architecture.md docs/01-System-Architecture.vi.md
mv docs/05-Implementation-Plan.md docs/05-Implementation-Plan.vi.md
mv docs/06-OpenClaw-Fork-Technical-Blueprint.md docs/06-OpenClaw-Fork-Technical-Blueprint.vi.md
mv docs/07-Commerce-Admin-and-Omnichannel-Usecases.md docs/07-Commerce-Admin-and-Omnichannel-Usecases.vi.md
```

Expected: only the base docs are renamed; `docs/superpowers/**` stays untouched.

- [ ] **Step 2: Rewrite the docs tests to cover locale resolution and fallback**

Update `vclaw-ui/lib/docs.test.ts` so it verifies `.vi.md`, `.en.md`, and English fallback metadata.

```ts
it("reads a Vietnamese document by locale", () => {
  const doc = getDocBySlug(["00-Business-Requirements"], "vi");

  expect(doc.requestedLocale).toBe("vi");
  expect(doc.resolvedLocale).toBe("vi");
  expect(doc.didFallback).toBe(false);
});

it("falls back to Vietnamese content when english markdown is missing", () => {
  const doc = getDocBySlug(["01-System-Architecture"], "en");

  expect(doc.requestedLocale).toBe("en");
  expect(doc.resolvedLocale).toBe("vi");
  expect(doc.didFallback).toBe(true);
});
```

- [ ] **Step 3: Run the docs test file and verify it fails**

Run: `npm test -- lib/docs.test.ts`
Expected: FAIL because the current loader only knows `.md` files and has no locale metadata.

- [ ] **Step 4: Refactor `lib/docs.ts` to resolve locale files**

Update the loader to work with `<basename>.<locale>.md`, track fallback status, and keep slugs stable.

```ts
export type DocRecord = DocEntry & {
  content: string;
  requestedLocale: AppLocale;
  resolvedLocale: AppLocale;
  didFallback: boolean;
};

function resolveDocFile(baseName: string, locale: AppLocale) {
  const preferred = `${baseName}.${locale}.md`;
  const fallback = `${baseName}.vi.md`;

  if (fs.existsSync(path.join(DOCS_ROOT, preferred))) {
    return { fileName: preferred, resolvedLocale: locale, didFallback: false };
  }

  if (locale === "en" && fs.existsSync(path.join(DOCS_ROOT, fallback))) {
    return { fileName: fallback, resolvedLocale: "vi" as const, didFallback: true };
  }

  throw new Error(`Documentation file not found for ${baseName} (${locale})`);
}
```

- [ ] **Step 5: Re-run the docs tests**

Run: `npm test -- lib/docs.test.ts`
Expected: PASS

---

### Task 4: Localize the docs routes and fallback notice

**Files:**
- Create: `vclaw-ui/app/[locale]/docs/[[...slug]]/page.tsx`
- Modify: `vclaw-ui/components/docs/docs-layout.tsx`
- Create: `vclaw-ui/messages/vi/docs.json`
- Create: `vclaw-ui/messages/en/docs.json`
- Delete after migration: `vclaw-ui/app/docs/[[...slug]]/page.tsx`

- [ ] **Step 1: Add the docs shell messages**

Create dictionaries for docs index copy, labels, and fallback notice.

```json
// vclaw-ui/messages/en/docs.json
{
  "indexTitle": "VClaw documentation",
  "indexDescription": "Read the product, architecture, and implementation references that define VClaw.",
  "sectionLabel": "Documentation",
  "sectionSubLabel": "Product and architecture references",
  "openPage": "Open documentation page",
  "previous": "Previous",
  "next": "Next",
  "fallbackNotice": "This document is not available in English yet. Showing the default Vietnamese version."
}
```

- [ ] **Step 2: Build the localized docs page wrapper**

Create `vclaw-ui/app/[locale]/docs/[[...slug]]/page.tsx` that passes the locale to `getDocBySlug`.

```tsx
import { getTranslations } from "next-intl/server";

import { getDocBySlug, getDocCategories, getNextPreviousDocs } from "@/lib/docs";

export default async function DocPage({
  params,
}: {
  params: Promise<{ locale: "vi" | "en"; slug?: string[] }>;
}) {
  const { locale, slug } = await params;
  const t = await getTranslations("docs");
  const categories = getDocCategories(locale);

  if (!slug || slug.length === 0) {
    return <DocsLayout title={t("indexTitle")} description={t("indexDescription")} categories={categories} currentHref={locale === "vi" ? "/docs" : "/en/docs"} labels={{ section: t("sectionLabel"), subSection: t("sectionSubLabel"), previous: t("previous"), next: t("next"), openPage: t("openPage") }} />;
  }

  const doc = getDocBySlug(slug, locale);
  const nav = getNextPreviousDocs(doc.slug, locale);

  return <DocsLayout title={doc.title} categories={categories} currentHref={doc.href} content={doc.content} previous={nav.previous} next={nav.next} fallbackNotice={doc.didFallback ? t("fallbackNotice") : undefined} labels={{ section: t("sectionLabel"), subSection: t("sectionSubLabel"), previous: t("previous"), next: t("next"), openPage: t("openPage") }} />;
}
```

- [ ] **Step 3: Update `DocsLayout` to accept localized props**

Modify `vclaw-ui/components/docs/docs-layout.tsx` so it no longer hardcodes English labels.

```tsx
type DocsLayoutProps = {
  title: string;
  description?: string;
  categories: DocCategory[];
  currentHref?: string;
  content?: string;
  previous?: DocEntry;
  next?: DocEntry;
  fallbackNotice?: string;
  labels: {
    section: string;
    subSection: string;
    previous: string;
    next: string;
    openPage: string;
  };
};
```

- [ ] **Step 4: Re-run docs-related tests and build**

Run: `npm test -- lib/docs.test.ts components/docs/markdown-viewer.test.tsx && npm run build`
Expected: docs tests pass and the build includes `/[locale]/docs/[[...slug]]`.

---

### Task 5: Localize the landing page

**Files:**
- Create: `vclaw-ui/app/[locale]/page.tsx`
- Modify: `vclaw-ui/components/marketing/landing-page.tsx`
- Create: `vclaw-ui/messages/vi/landing.json`
- Create: `vclaw-ui/messages/en/landing.json`
- Delete after migration: `vclaw-ui/app/page.tsx`

- [ ] **Step 1: Add the landing dictionaries**

Move the current marketing copy into locale files rather than keeping large text arrays inside the component.

```json
// vclaw-ui/messages/vi/landing.json
{
  "heroTitle": "VClaw giup doanh nghiep nho van hanh ban hang, thanh toan va cham soc sau ban tren mot be mat web local-first.",
  "heroDescription": "Duoc xay dung tren OpenClaw nhu mot controlled product fork, VClaw bien cac thao tac van hanh phan manh trong chat thanh workflow thuong mai ro rang cho nguoi van hanh khong chuyen ky thuat.",
  "exploreDocs": "Xem tai lieu",
  "openAdmin": "Mo shell quan tri"
}
```

- [ ] **Step 2: Change the landing component to consume translations**

Update `vclaw-ui/components/marketing/landing-page.tsx` to accept translated labels instead of hardcoded English strings.

```tsx
type LandingPageProps = {
  locale: "vi" | "en";
  labels: {
    heroTitle: string;
    heroDescription: string;
    exploreDocs: string;
    openAdmin: string;
  };
};

export function LandingPage({ locale, labels }: LandingPageProps) {
  return (
    <main>
      <h1>{labels.heroTitle}</h1>
      <p>{labels.heroDescription}</p>
      <Button href={locale === "vi" ? "/docs" : "/en/docs"}>{labels.exploreDocs}</Button>
    </main>
  );
}
```

- [ ] **Step 3: Create the localized landing route**

Create `vclaw-ui/app/[locale]/page.tsx`.

```tsx
import { getTranslations } from "next-intl/server";

import { LandingPage } from "@/components/marketing/landing-page";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: "vi" | "en" }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("landing");

  return (
    <LandingPage
      locale={locale}
      labels={{
        heroTitle: t("heroTitle"),
        heroDescription: t("heroDescription"),
        exploreDocs: t("exploreDocs"),
        openAdmin: t("openAdmin"),
      }}
    />
  );
}
```

- [ ] **Step 4: Verify the localized landing routes build**

Run: `npm run build`
Expected: build output includes both the default home route and the `/en` route.

---

### Task 6: Localize the admin shell and admin routes

**Files:**
- Create: `vclaw-ui/app/[locale]/admin/layout.tsx`
- Create: `vclaw-ui/app/[locale]/admin/page.tsx`
- Create: `vclaw-ui/app/[locale]/admin/onboarding/page.tsx`
- Create: `vclaw-ui/app/[locale]/admin/inbox/page.tsx`
- Create: `vclaw-ui/app/[locale]/admin/customers/page.tsx`
- Create: `vclaw-ui/app/[locale]/admin/orders/page.tsx`
- Create: `vclaw-ui/app/[locale]/admin/payments/page.tsx`
- Create: `vclaw-ui/app/[locale]/admin/bookings/page.tsx`
- Create: `vclaw-ui/app/[locale]/admin/integrations/page.tsx`
- Create: `vclaw-ui/app/[locale]/admin/automation/page.tsx`
- Create: `vclaw-ui/app/[locale]/admin/settings/page.tsx`
- Modify: `vclaw-ui/components/admin/admin-shell.tsx`
- Create: `vclaw-ui/messages/vi/admin.json`
- Create: `vclaw-ui/messages/en/admin.json`
- Delete after migration: `vclaw-ui/app/admin/**`

- [ ] **Step 1: Create the admin dictionaries**

Group page titles, descriptions, sidebar labels, and CTA labels under one namespace.

```json
// vclaw-ui/messages/en/admin.json
{
  "sidebar.overview": "Overview",
  "sidebar.onboarding": "Onboarding",
  "sidebar.inbox": "Inbox",
  "sidebar.customers": "Customers",
  "sidebar.orders": "Orders",
  "sidebar.payments": "Payments",
  "sidebar.bookings": "Bookings",
  "sidebar.integrations": "Integrations",
  "sidebar.automation": "Automation",
  "sidebar.settings": "Settings"
}
```

- [ ] **Step 2: Refactor `AdminShell` to accept localized labels**

Remove the hardcoded English navigation array from `vclaw-ui/components/admin/admin-shell.tsx`.

```tsx
export type AdminNavigationItem = {
  href: string;
  label: string;
};

export function AdminShell({
  navigation,
  currentPath,
  title,
  description,
  children,
}: {
  navigation: AdminNavigationItem[];
  currentPath: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  // render navigation from props
}
```

- [ ] **Step 3: Add a helper that builds locale-aware admin navigation**

Create a small helper near the route files or in `i18n/navigation.ts`.

```ts
export function getAdminNavigation(locale: AppLocale, t: (key: string) => string) {
  const base = locale === "vi" ? "/admin" : "/en/admin";

  return [
    { href: base, label: t("sidebar.overview") },
    { href: `${base}/onboarding`, label: t("sidebar.onboarding") },
    { href: `${base}/inbox`, label: t("sidebar.inbox") },
  ];
}
```

- [ ] **Step 4: Migrate each admin route into `app/[locale]/admin/**`**

For each page, keep the current mock data structure but localize the page title and description with `getTranslations("admin")`.

```tsx
export default async function OrdersPage({
  params,
}: {
  params: Promise<{ locale: "vi" | "en" }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("admin");

  return (
    <AdminShell
      navigation={getAdminNavigation(locale, t)}
      currentPath={locale === "vi" ? "/admin/orders" : "/en/admin/orders"}
      title={t("orders.title")}
      description={t("orders.description")}
    >
      {/* existing cards and workflow blocks */}
    </AdminShell>
  );
}
```

- [ ] **Step 5: Run the full test, lint, and build suite**

Run:

```bash
npm test
npm run lint
npm run build
```

Expected:

```text
All Vitest suites pass
ESLint exits with code 0
Next build includes /, /en, /docs, /en/docs, /admin, and /en/admin routes
```

---

### Task 7: Manual verification and cleanup

**Files:**
- Modify if needed: localized route files and message JSONs

- [ ] **Step 1: Start the dev server and inspect both locales**

Run: `npm run dev`
Expected: app starts without route conflicts.

- [ ] **Step 2: Manually verify route pairs**

Check these pages in a browser:

```text
/                     -> Vietnamese landing
/en                   -> English landing
/docs                 -> Vietnamese docs index
/en/docs              -> English docs index
/docs/00-Business-Requirements
/en/docs/00-Business-Requirements
/admin
/en/admin
/admin/orders
/en/admin/orders
```

Expected:

```text
Vietnamese routes render Vietnamese UI chrome
English routes render English UI chrome
The language switcher keeps the user on the equivalent route
English docs with no .en.md show the fallback notice and Vietnamese markdown body
```

- [ ] **Step 3: Remove the superseded non-locale route files**

Delete the old route files under `vclaw-ui/app/docs` and `vclaw-ui/app/admin` only after the localized routes are confirmed to render the same surfaces.

- [ ] **Step 4: Final status check**

Run: `git status --short`
Expected: only the planned i18n refactor files are changed.

---

## Self-Review

### Spec coverage

- Route model `/` and `/en/...`: covered by Tasks 1 and 2.
- Localized UI chrome for landing/docs/admin: covered by Tasks 4, 5, and 6.
- Language switcher with equivalent route mapping: covered by Task 2 and verified in Task 7.
- Locale-aware docs loader with English fallback notice: covered by Tasks 3 and 4.
- Build/lint/test verification: covered by Tasks 5, 6, and 7.

### Placeholder scan

- No `TODO`, `TBD`, or "similar to previous task" placeholders remain.
- All code-changing steps include concrete snippets or commands.

### Type consistency

- Locale type is consistently `"vi" | "en"` through routing, docs loader, and route params.
- Docs fallback metadata uses `requestedLocale`, `resolvedLocale`, and `didFallback` consistently across loader and UI.
