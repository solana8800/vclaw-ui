import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

type OperatorStartStep = {
  title: string;
  description: string;
  href: string;
};

export function OperatorStartBanner({
  title,
  subtitle,
  steps,
  guideHref,
  guideLabel,
  stepWord,
  openWord,
}: {
  title: string;
  subtitle: string;
  steps: OperatorStartStep[];
  guideHref: string;
  guideLabel: string;
  stepWord: string;
  openWord: string;
}) {
  return (
    <section className="rounded-2xl border border-[color:var(--brand-soft)] bg-gradient-to-br from-[color:var(--brand-softer)]/50 to-[color:var(--surface)] p-5 shadow-[0_20px_50px_-40px_var(--shadow-color)] sm:rounded-3xl sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[color:var(--brand-strong)]">
            <Sparkles className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">{title}</span>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[color:var(--foreground-strong)]">
            {subtitle}
          </p>
        </div>
        <Link
          href={guideHref}
          className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-[color:var(--brand)] bg-[color:var(--surface)] px-4 py-2.5 text-sm font-semibold text-[color:var(--brand-strong)] transition-colors duration-200 hover:bg-[color:var(--brand-softer)]"
        >
          {guideLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, i) => (
          <li key={step.href}>
            <Link
              href={step.href}
              className="flex h-full cursor-pointer flex-col rounded-xl border border-[color:var(--line)] bg-[color:var(--surface)] p-4 transition-colors duration-200 hover:border-[color:var(--brand-soft)] hover:shadow-md"
            >
              <span className="text-xs font-bold text-[color:var(--muted)]">
                {stepWord} {i + 1}
              </span>
              <span className="mt-1 font-semibold text-[color:var(--foreground-strong)]">{step.title}</span>
              <span className="mt-1 flex-1 text-xs leading-relaxed text-[color:var(--muted)]">{step.description}</span>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--brand)]">
                {openWord} <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
