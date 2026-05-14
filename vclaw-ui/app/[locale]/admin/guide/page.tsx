import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { MarkdownViewer } from "@/components/docs/markdown-viewer";
import { getAdminPath } from "@/lib/admin/content";
import { getAdminLocaleContent } from "@/lib/admin/runtime";
import { getDocBySlug } from "@/lib/docs";
import type { AppLocale } from "@/i18n/routing";

type AdminGuidePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AdminGuidePage({ params }: AdminGuidePageProps) {
  const { locale } = (await params) as { locale: AppLocale };
  setRequestLocale(locale);
  const { admin, navigation, shell } = await getAdminLocaleContent(locale);
  const t = await getTranslations({ locale, namespace: "docs" });

  const mermaidToolbar = {
    zoomIn: t("mermaid.zoomIn"),
    zoomOut: t("mermaid.zoomOut"),
    resetZoom: t("mermaid.resetZoom"),
    wheelHint: t("mermaid.wheelHint"),
    dragHint: t("mermaid.dragHint"),
  };

  let doc;
  try {
    doc = getDocBySlug(["11-User-Manual-And-Installation"], locale);
  } catch (error) {
    console.error("[AdminGuide] Failed to load manual:", error);
    notFound();
  }

  return (
    <AdminShell
      navigation={navigation}
      currentPath={getAdminPath(locale, "/admin/guide")}
      title={admin.guide.title}
      description={admin.guide.description}
      badge={shell.badge}
      sidebarTitle={shell.sidebarTitle}
      sidebarDescription={shell.sidebarDescription}
    >
      <div className="mx-auto max-w-4xl py-8">
        <MarkdownViewer
          content={doc.content}
          mermaidToolbar={mermaidToolbar}
        />
      </div>
    </AdminShell>
  );
}
