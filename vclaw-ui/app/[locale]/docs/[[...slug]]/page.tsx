import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { DocsLayout } from "@/components/docs/docs-layout";
import {
  getAllDocs,
  getDocBySlug,
  getDocCategories,
  getDailyPassword,
  getNextPreviousDocs,
} from "@/lib/docs";
import { ProtectedContent } from "@/components/docs/protected-content";
import { getLocaleHref, locales } from "@/i18n/routing";
import type { AppLocale } from "@/i18n/routing";

export function generateStaticParams() {
  const params: Array<{ locale: string; slug?: string[] }> = [];

  for (const locale of locales) {
    // Thêm trang chủ docs (không có slug)
    params.push({ locale, slug: [] });

    // Thêm tất cả các trang con
    const docs = getAllDocs(locale as AppLocale);
    for (const doc of docs) {
      params.push({ locale, slug: doc.slug });
    }
  }

  return params;
}

type DocPageProps = {
  params: Promise<{ locale: string; slug?: string[] }>;
};

export default async function DocPage({ params }: DocPageProps) {
  const { locale, slug } = (await params) as { locale: AppLocale; slug?: string[] };
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "docs" });
  const categories = getDocCategories(locale);
  const labels = {
    section: t("sectionLabel"),
    subSection: t("sectionSubLabel"),
    openPage: t("openPage"),
    previous: t("previous"),
    next: t("next"),
    mermaid: {
      zoomIn: t("mermaid.zoomIn"),
      zoomOut: t("mermaid.zoomOut"),
      resetZoom: t("mermaid.resetZoom"),
      wheelHint: t("mermaid.wheelHint"),
      dragHint: t("mermaid.dragHint"),
    },
    protection: {
      title: t("protection.title"),
      description: t("protection.description"),
      placeholder: t("protection.placeholder"),
      button: t("protection.button"),
      error: t("protection.error"),
    },
    indexBadge: t("indexBadge"),
    indexHomeCta: t("indexHomeCta"),
    indexDownloadCta: t("indexDownloadCta"),
  };

  const homeHref = getLocaleHref(locale, "/");
  const appDownloadHref = `${homeHref}#download`;
  const docsIndexHref = getLocaleHref(locale, "/docs");

  if (!slug || slug.length === 0) {
    return (
      <DocsLayout
        title={t("indexTitle")}
        description={t("indexDescription")}
        categories={categories}
        currentHref={docsIndexHref}
        labels={labels}
        isDocsIndex
        homeHref={homeHref}
        appDownloadHref={appDownloadHref}
      />
    );
  }

  let doc;

  try {
    doc = getDocBySlug(slug, locale);
  } catch {
    notFound();
  }

  const { previous, next } = getNextPreviousDocs(doc.slug, locale);

  return (
    <DocsLayout
      title={doc.title}
      categories={categories}
      currentHref={doc.href}
      content={doc.isPublic ? doc.content : undefined}
      previous={previous}
      next={next}
      fallbackNotice={doc.didFallback ? t("fallbackNotice") : undefined}
      labels={labels}
      homeHref={homeHref}
      appDownloadHref={appDownloadHref}
    >
      {!doc.isPublic && (
        <ProtectedContent
          slug={doc.slug.join("/")}
          content={doc.content}
          expectedPassword={getDailyPassword()}
          mermaidLabels={labels.mermaid}
          labels={labels.protection}
        />
      )}
    </DocsLayout>
  );
}
