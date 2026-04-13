import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpenText, FileText } from "lucide-react";

import type { DocEntry } from "@/lib/docs";
import { cn } from "@/lib/utils";
import { MarkdownViewer } from "@/components/docs/markdown-viewer";

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
  labels: {
    section: string;
    subSection: string;
    openPage: string;
    previous: string;
    next: string;
  };
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
  labels,
}: DocsLayoutProps) {
  return (
    <main className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="h-fit rounded-3xl border border-[color:var(--line)] bg-[color:var(--surface-glass)] p-5 shadow-[0_32px_70px_-54px_var(--shadow-color)] backdrop-blur">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl bg-[color:var(--brand-soft)] p-2 text-[color:var(--brand-strong)]">
            <BookOpenText className="h-5 w-5" />
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

        <div className="space-y-6">
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
                        "flex items-start gap-3 rounded-2xl px-3 py-3 text-sm transition",
                        active
                          ? "bg-[image:var(--brand-gradient)] text-[color:var(--brand-contrast)] shadow-[0_20px_40px_-26px_var(--brand-glow)]"
                          : "text-[color:var(--muted)] hover:bg-[color:var(--brand-softer)] hover:text-[color:var(--foreground-strong)]",
                      )}
                    >
                      <FileText className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>

      <section className="min-w-0 rounded-[2rem] border border-[color:var(--line)] bg-[color:var(--surface-glass)] p-8 shadow-[0_32px_70px_-54px_var(--shadow-color)] backdrop-blur">
        <div className="mb-8 border-b border-[color:var(--line)] pb-6">
          <h1 className="text-3xl font-bold tracking-tight text-[color:var(--foreground-strong)]">
            {title}
          </h1>
          {description ? (
            <p className="mt-3 max-w-3xl text-base leading-7 text-[color:var(--muted)]">
              {description}
            </p>
          ) : null}
        </div>

        {content ? (
          <MarkdownViewer content={content} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {categories.flatMap((category) =>
              category.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--surface)] p-5 transition hover:border-[color:var(--brand)] hover:bg-[color:var(--brand-softer)]"
                >
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--brand-strong)]">
                    {item.category}
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
                className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--surface)] p-4 transition hover:border-[color:var(--brand)] hover:bg-[color:var(--brand-softer)]"
              >
                <div className="mb-2 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                  <ArrowLeft className="h-3.5 w-3.5" />
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
                className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--surface)] p-4 transition hover:border-[color:var(--brand)] hover:bg-[color:var(--brand-softer)]"
              >
                <div className="mb-2 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                  {labels.next}
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
                <div className="font-semibold text-[color:var(--foreground-strong)]">
                  {next.title}
                </div>
              </Link>
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}
