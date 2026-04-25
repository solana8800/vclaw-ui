import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  ChevronRight,
  Download,
  FileText,
  Home,
  Lock,
} from "lucide-react";

import type { DocEntry } from "@/lib/docs";
import { cn } from "@/lib/shared";
import {
  MarkdownViewer,
  type MermaidToolbarLabels,
} from "@/components/docs/markdown-viewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type DocCategory = {
  title: string;
  items: DocEntry[];
};

type DocsLayoutProps = {
  title: string;
  description?: string;
  categories: DocCategory[];
  currentHref?: string;
  content?: string;
  previous?: DocEntry;
  next?: DocEntry;
  fallbackNotice?: string;
  isDocsIndex?: boolean;
  homeHref?: string;
  /** Trang chủ locale + `#download` — ưu tiên ứng dụng desktop */
  appDownloadHref?: string;
  labels: {
    section: string;
    subSection: string;
    openPage: string;
    previous: string;
    next: string;
    mermaid: MermaidToolbarLabels;
    indexBadge: string;
    indexHomeCta: string;
    indexDownloadCta: string;
  };
  children?: ReactNode;
};

export function DocsLayout({
  title,
  description,
  categories,
  currentHref,
  content,
  previous,
  next,
  fallbackNotice,
  isDocsIndex,
  homeHref,
  appDownloadHref,
  labels,
  children,
}: DocsLayoutProps) {
  return (
    <div className="vclaw-grid-bg vclaw-page-shell grid min-h-[calc(100vh-73px)] gap-4 py-6 sm:gap-8 sm:py-10 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
      <aside className="h-fit rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-glass)] p-4 shadow-[0_32px_70px_-54px_var(--shadow-color)] backdrop-blur sm:rounded-3xl sm:p-5 lg:sticky lg:top-24 lg:max-h-[calc(100vh-6.5rem)] lg:overflow-y-auto">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl bg-[color:var(--brand-soft)] p-2 text-[color:var(--brand-strong)]">
            <BookOpenText className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <div className="text-sm font-semibold text-[color:var(--foreground-strong)]">
              {labels.section}
            </div>
            <div className="text-xs text-[color:var(--muted)]">
              {labels.subSection}
            </div>
          </div>
        </div>

        <nav className="space-y-6" aria-label={labels.section}>
          {categories.map((category) => (
            <div key={category.title}>
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
                {category.title}
              </div>
              <div className="space-y-1">
                {category.items.map((item) => {
                  const active = item.href === currentHref;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-2xl px-3 py-3 text-sm transition-colors duration-200",
                        active
                          ? "bg-[image:var(--brand-gradient)] text-[color:var(--brand-contrast)] shadow-[0_20px_40px_-26px_var(--brand-glow)]"
                          : "text-[color:var(--muted)] hover:bg-[color:var(--brand-softer)] hover:text-[color:var(--foreground-strong)]",
                      )}
                    >
                      <FileText className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                      <span className="flex-1">{item.title}</span>
                      {!item.isPublic ? (
                        <Lock
                          className="ml-auto mt-1 h-3 w-3 opacity-60"
                          aria-label="Restricted"
                        />
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <section className="min-w-0 rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-glass)] p-4 shadow-[0_32px_70px_-54px_var(--shadow-color)] backdrop-blur sm:rounded-[2rem] sm:p-8">
        {isDocsIndex && description ? (
          <header className="relative mb-10 overflow-hidden rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)]/80 p-6 sm:rounded-3xl sm:p-8">
            <div
              className="absolute inset-x-0 top-0 h-1 bg-[image:var(--brand-gradient)] opacity-90 sm:rounded-t-3xl"
              aria-hidden
            />
            <div className="relative pt-1">
              <Badge className="mb-4 border-[color:var(--line)] bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)]">
                {labels.indexBadge}
              </Badge>
              <h1 className="text-balance text-3xl font-bold tracking-tight text-[color:var(--foreground-strong)] sm:text-4xl">
                {title}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-[color:var(--muted)] sm:text-lg sm:leading-8">
                {description}
              </p>
              {homeHref && appDownloadHref ? (
                <div className="mt-8 flex flex-wrap gap-3">
                  <Button
                    href={homeHref}
                    variant="outline"
                    size="lg"
                    className="cursor-pointer border-[color:var(--line)]"
                  >
                    <Home className="h-4 w-4" />
                    {labels.indexHomeCta}
                  </Button>
                  <Button href={appDownloadHref} size="lg" className="cursor-pointer">
                    <Download className="h-4 w-4" />
                    {labels.indexDownloadCta}
                  </Button>
                </div>
              ) : null}
            </div>
          </header>
        ) : (
          <header className="mb-8 border-b border-[color:var(--line)] pb-6">
            {homeHref && appDownloadHref ? (
              <div className="mb-4 flex flex-wrap items-center gap-1">
                <Button
                  href={homeHref}
                  variant="ghost"
                  size="sm"
                  className="cursor-pointer text-[color:var(--muted)] hover:text-[color:var(--foreground-strong)]"
                >
                  <Home className="h-4 w-4" />
                  {labels.indexHomeCta}
                </Button>
                <span className="px-1 text-[color:var(--muted)]" aria-hidden>
                  ·
                </span>
                <Button
                  href={appDownloadHref}
                  variant="ghost"
                  size="sm"
                  className="cursor-pointer text-[color:var(--muted)] hover:text-[color:var(--foreground-strong)]"
                >
                  <Download className="h-4 w-4" />
                  {labels.indexDownloadCta}
                </Button>
              </div>
            ) : null}
            <h1 className="text-3xl font-bold tracking-tight text-[color:var(--foreground-strong)] sm:text-4xl">
              {title}
            </h1>
            {description ? (
              <p className="mt-3 max-w-3xl text-base leading-7 text-[color:var(--muted)]">
                {description}
              </p>
            ) : null}
          </header>
        )}

        {content ? (
          <MarkdownViewer content={content} mermaidToolbar={labels.mermaid} />
        ) : children ? (
          children
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {categories.flatMap((category) =>
              category.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group relative cursor-pointer overflow-hidden rounded-3xl border border-[color:var(--line)] bg-[color:var(--surface)] p-5 transition-colors duration-200 hover:border-[color:var(--brand-soft)] hover:bg-[color:var(--brand-softer)]/40"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--brand-strong)]">
                      {item.category}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[color:var(--muted)] transition-colors duration-200 group-hover:text-[color:var(--brand-strong)]" />
                  </div>
                  <div className="text-lg font-semibold text-[color:var(--foreground-strong)]">
                    {item.title}
                  </div>
                  <div className="mt-2 text-sm text-[color:var(--muted)]">
                    {labels.openPage}
                  </div>
                </Link>
              )),
            )}
          </div>
        )}

        {fallbackNotice ? (
          <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 shadow-[0_24px_50px_-42px_rgba(180,83,9,0.45)] dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
            {fallbackNotice}
          </div>
        ) : null}

        {content ? (
          <div className="mt-12 grid gap-4 border-t border-[color:var(--line)] pt-6 md:grid-cols-2">
            {previous ? (
              <Link
                href={previous.href}
                className="cursor-pointer rounded-3xl border border-[color:var(--line)] bg-[color:var(--surface)] p-4 transition-colors duration-200 hover:border-[color:var(--brand-soft)] hover:bg-[color:var(--brand-softer)]/50"
              >
                <div className="mb-2 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                  {labels.previous}
                </div>
                <div className="font-semibold text-[color:var(--foreground-strong)]">
                  {previous.title}
                </div>
              </Link>
            ) : (
              <div />
            )}

            {next ? (
              <Link
                href={next.href}
                className="cursor-pointer rounded-3xl border border-[color:var(--line)] bg-[color:var(--surface)] p-4 transition-colors duration-200 hover:border-[color:var(--brand-soft)] hover:bg-[color:var(--brand-softer)]/50"
              >
                <div className="mb-2 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                  {labels.next}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </div>
                <div className="font-semibold text-[color:var(--foreground-strong)]">
                  {next.title}
                </div>
              </Link>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
