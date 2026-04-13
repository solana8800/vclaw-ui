import type { ReactNode } from "react";

type LegalLayoutProps = {
  title: string;
  lastUpdated: string;
  introduction: string;
  children: ReactNode;
};

export function LegalLayout({
  title,
  lastUpdated,
  introduction,
  children,
}: LegalLayoutProps) {
  return (
    <div className="relative min-h-screen pt-20 pb-20 overflow-hidden">
      {/* Background decoration */}
      <div className="vclaw-grid-bg absolute inset-0 -z-10" />
      <div className="absolute top-0 left-1/4 h-96 w-96 -z-10 bg-brand-soft blur-[100px] rounded-full opacity-60" />
      <div className="absolute bottom-0 right-1/4 h-96 w-96 -z-10 bg-brand-soft blur-[100px] rounded-full opacity-40" />

      <article className="mx-auto max-w-3xl px-6">
        <header className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-[color:var(--foreground-strong)] sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 text-sm text-[color:var(--muted)] font-medium">
            {lastUpdated}
          </p>
          <div className="mt-8 text-lg leading-relaxed text-[color:var(--foreground)] opacity-90">
            {introduction}
          </div>
        </header>

        <div className="vclaw-prose prose prose-rose max-w-none space-y-12">
          {children}
        </div>
      </article>
    </div>
  );
}

export function LegalSection({
  title,
  content,
  items,
}: {
  title: string;
  content?: string;
  items?: string[];
}) {
  return (
    <section>
      <h2 className="text-2xl font-bold tracking-tight text-[color:var(--foreground-strong)] mb-4">
        {title}
      </h2>
      {content && (
        <p className="text-base leading-relaxed text-[color:var(--foreground)] opacity-80 mb-6">
          {content}
        </p>
      )}
      {items && (
        <ul className="space-y-4">
          {items.map((item, idx) => (
            <li key={idx} className="flex gap-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[color:var(--brand)] text-[10px] font-bold">
                {idx + 1}
              </span>
              <span className="text-base text-[color:var(--foreground)] opacity-80">
                {item}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
