import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { DocsLayout } from "@/components/docs/docs-layout";
import {
  getDocBySlug,
  getDocCategories,
  getNextPreviousDocs,
} from "@/lib/docs";
import type { AppLocale } from "@/i18n/routing";

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
  };

  if (!slug || slug.length === 0) {
    return (
      <DocsLayout
        title={t("indexTitle")}
        description={t("indexDescription")}
        categories={categories}
        currentHref={locale === "vi" ? "/docs" : "/en/docs"}
        labels={labels}
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
      content={doc.content}
      previous={previous}
      next={next}
      fallbackNotice={doc.didFallback ? t("fallbackNotice") : undefined}
      labels={labels}
    />
  );
}
