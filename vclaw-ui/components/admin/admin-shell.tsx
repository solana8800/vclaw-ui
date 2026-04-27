import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  LayoutDashboard,
} from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/shared";

export type AdminNavigationItem = {
  href?: string;
  label: string;
  icon?: LucideIcon;
  type?: "link" | "separator" | "label";
};

export function AdminShell({
  navigation,
  currentPath,
  title,
  description,
  badge,
  sidebarTitle,
  sidebarDescription,
  headerCompact = true,
  children,
}: {
  navigation: AdminNavigationItem[];
  currentPath: string;
  title: string;
  description: string;
  badge: string;
  sidebarTitle: string;
  sidebarDescription: string;
  headerCompact?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="vclaw-grid-bg vclaw-page-shell grid min-h-[calc(100vh-73px)] gap-4 py-6 sm:gap-8 sm:py-10 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
      <aside className="h-fit rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-glass)] p-4 shadow-[0_32px_70px_-54px_var(--shadow-color)] backdrop-blur sm:rounded-3xl sm:p-5">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl bg-[color:var(--brand-soft)] p-2.5 text-[color:var(--brand-strong)] ring-1 ring-[color:var(--brand-soft)]/80">
            <LayoutDashboard className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="font-semibold leading-snug text-[color:var(--foreground-strong)]">
              {sidebarTitle}
            </div>
          </div>
        </div>

        <nav className="space-y-1" aria-label={sidebarTitle}>
          {navigation.map((item, index) => {
            if (item.type === "separator") {
              return (
                <div
                  key={`sep-${index}`}
                  className="my-3 h-px bg-[color:var(--line)] opacity-60"
                  aria-hidden
                />
              );
            }
            if (item.type === "label") {
              return (
                <div
                  key={`label-${index}`}
                  className="mb-1.5 mt-4 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--muted)]"
                >
                  {item.label}
                </div>
              );
            }

            const active = item.href ? currentPath === item.href : false;
            const Icon = item.icon;

            return (
              <Link
                key={item.href || index}
                href={item.href || "#"}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors duration-200",
                  active
                    ? "bg-[image:var(--brand-gradient)] text-[color:var(--brand-contrast)] shadow-[0_20px_40px_-26px_var(--brand-glow)]"
                    : "text-[color:var(--muted)] hover:bg-[color:var(--brand-softer)] hover:text-[color:var(--foreground-strong)]",
                )}
              >
                {Icon ? (
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      active ? "text-current" : "text-[color:var(--muted)]",
                    )}
                    aria-hidden
                  />
                ) : null}
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <section className="relative min-w-0">
        <div className="absolute inset-0 overflow-y-auto pr-4 vclaw-custom-scrollbar">
          <header
            className={cn(
              "relative overflow-hidden rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-glass)] shadow-[0_32px_70px_-54px_var(--shadow-color)] backdrop-blur",
              headerCompact
                ? "mb-4 p-4 sm:mb-5 sm:rounded-[1.65rem] sm:p-5"
                : "mb-6 p-5 sm:mb-8 sm:rounded-[2rem] sm:p-8",
            )}
          >
            <div
              className={cn(
                "absolute inset-x-0 top-0 h-1 bg-[image:var(--brand-gradient)] opacity-90",
                headerCompact
                  ? "rounded-t-2xl sm:rounded-t-[1.65rem]"
                  : "rounded-t-2xl sm:rounded-t-[2rem]",
              )}
              aria-hidden
            />
            <div className={cn("relative", headerCompact ? "pt-0.5" : "pt-1")}>
              <Badge
                className={cn(
                  "border-[color:var(--line)] bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)]",
                  headerCompact ? "mb-2" : "mb-3",
                )}
              >
                {badge}
              </Badge>
              <h1
                className={cn(
                  "font-bold tracking-tight text-[color:var(--foreground-strong)]",
                  headerCompact ? "text-2xl sm:text-[1.7rem]" : "text-3xl sm:text-4xl",
                )}
              >
                {title}
              </h1>
              <p
                className={cn(
                  "max-w-3xl text-pretty text-[color:var(--muted)]",
                  headerCompact ? "mt-2 text-sm leading-6" : "mt-3 text-base leading-7",
                )}
              >
                {description}
              </p>
            </div>
          </header>
          <div className="space-y-6 sm:space-y-8 pb-10">{children}</div>
        </div>
      </section>
    </div>
  );
}

export function StatsGrid({
  items,
}: {
  items: { label: string; value: string; note: string }[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card
          key={item.label}
          className="border-[color:var(--line)] transition-colors duration-200 hover:border-[color:var(--brand-soft)]"
        >
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted)]">
              {item.label}
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums tracking-tight">
              {item.value}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-[color:var(--muted)]">{item.note}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ListCard({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: { title: string; subtitle: string; badge?: string }[];
}) {
  return (
    <Card className="border-[color:var(--line)] shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div
            key={`${item.title}-${item.subtitle}`}
            className="flex flex-col gap-2 rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-4 py-4 transition-colors duration-200 hover:border-[color:var(--brand-soft)] md:flex-row md:items-center md:justify-between"
          >
            <div>
              <div className="font-medium text-[color:var(--foreground-strong)]">{item.title}</div>
              <div className="mt-1 text-sm text-[color:var(--muted)]">
                {item.subtitle}
              </div>
            </div>
            {item.badge ? <Badge>{item.badge}</Badge> : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function WorkflowCard({
  title,
  description,
  steps,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  description: string;
  steps: string[];
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <Card className="vclaw-inverse-surface border-[color:var(--inverse-card-border)] text-[color:var(--inverse-foreground)] shadow-[0_24px_60px_-40px_rgba(0,0,0,0.35)]">
      <CardHeader>
        <CardTitle className="text-lg text-[color:var(--inverse-foreground)] sm:text-xl">
          {title}
        </CardTitle>
        <CardDescription className="text-[color:var(--inverse-muted)]">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {steps.map((step, index) => (
            <li
              key={step}
              className="flex items-start gap-3 rounded-2xl border border-[color:var(--inverse-card-border)] bg-[color:var(--inverse-card)] px-4 py-3 transition-colors duration-200 hover:border-[color:var(--brand)]/40"
            >
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--brand-strong)]" />
              <div className="text-sm leading-6 text-[color:var(--inverse-foreground)]">
                <span className="mr-2 text-[color:var(--brand-strong)]">{index + 1}.</span>
                {step}
              </div>
            </li>
          ))}
        </ol>
        {ctaHref ? (
          <div className="mt-5">
            <Button href={ctaHref} variant="outline" className="cursor-pointer">
              {ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function SplitHero({
  left,
  right,
}: {
  left: ReactNode;
  right: ReactNode;
}) {
  return <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">{left}{right}</div>;
}

export function NextStepBanner({
  href,
  label,
  copy,
}: {
  href: string;
  label: string;
  copy: string;
}) {
  return (
    <Link
      href={href}
      className="group flex cursor-pointer items-center justify-between rounded-3xl border border-[color:var(--line)] bg-[color:var(--surface-glass)] px-5 py-4 shadow-sm transition-colors duration-200 hover:border-[color:var(--brand-soft)] hover:bg-[color:var(--brand-softer)]/60"
    >
      <div>
        <div className="font-semibold text-[color:var(--foreground-strong)]">{label}</div>
        <div className="mt-1 text-sm text-[color:var(--muted)]">{copy}</div>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-[color:var(--brand)] transition-colors group-hover:text-[color:var(--brand-strong)]" />
    </Link>
  );
}
