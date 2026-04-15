import Link from "next/link";
import { ArrowRight, CheckCircle2, ChevronRight, LayoutDashboard } from "lucide-react";
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
import { cn } from "@/lib/utils";

export type AdminNavigationItem = {
  href: string;
  label: string;
};

export function AdminShell({
  navigation,
  currentPath,
  title,
  description,
  badge,
  sidebarTitle,
  sidebarDescription,
  children,
}: {
  navigation: AdminNavigationItem[];
  currentPath: string;
  title: string;
  description: string;
  badge: string;
  sidebarTitle: string;
  sidebarDescription: string;
  children: ReactNode;
}) {
  return (
    <main className="vclaw-page-shell grid min-h-[calc(100vh-73px)] gap-4 py-5 sm:gap-8 sm:py-8 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-glass)] p-4 shadow-[0_32px_70px_-54px_var(--shadow-color)] backdrop-blur sm:rounded-3xl sm:p-5">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl bg-[color:var(--brand-soft)] p-2 text-[color:var(--brand-strong)]">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold text-[color:var(--foreground-strong)]">
              {sidebarTitle}
            </div>
            <div className="text-sm text-[color:var(--muted)]">
              {sidebarDescription}
            </div>
          </div>
        </div>

        <div className="space-y-1">
          {navigation.map((item) => {
            const active = currentPath === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block rounded-2xl px-4 py-3 text-sm font-medium transition",
                  active
                    ? "bg-[image:var(--brand-gradient)] text-[color:var(--brand-contrast)] shadow-[0_20px_40px_-26px_var(--brand-glow)]"
                    : "text-[color:var(--muted)] hover:bg-[color:var(--brand-softer)] hover:text-[color:var(--foreground-strong)]",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </aside>

      <section className="min-w-0">
        <div className="mb-6 rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-glass)] p-4 shadow-[0_32px_70px_-54px_var(--shadow-color)] backdrop-blur sm:mb-8 sm:rounded-[2rem] sm:p-8">
          <Badge className="mb-4">{badge}</Badge>
          <h1 className="text-3xl font-bold tracking-tight text-[color:var(--foreground-strong)]">
            {title}
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[color:var(--muted)]">
            {description}
          </p>
        </div>
        <div className="space-y-6">{children}</div>
      </section>
    </main>
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
        <Card key={item.label}>
          <CardHeader>
            <CardDescription>{item.label}</CardDescription>
            <CardTitle className="text-3xl">{item.value}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[color:var(--muted)]">{item.note}</p>
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
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div
            key={`${item.title}-${item.subtitle}`}
            className="flex flex-col gap-2 rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-4 py-4 md:flex-row md:items-center md:justify-between"
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
    <Card className="vclaw-inverse-surface border-[color:var(--inverse-card-border)] text-[color:var(--inverse-foreground)]">
      <CardHeader>
        <CardTitle className="text-[color:var(--inverse-foreground)]">{title}</CardTitle>
        <CardDescription className="text-[color:var(--inverse-muted)]">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {steps.map((step, index) => (
            <li
              key={step}
              className="flex items-start gap-3 rounded-2xl border border-[color:var(--inverse-card-border)] bg-[color:var(--inverse-card)] px-4 py-3"
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
            <Button href={ctaHref} variant="outline">
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
      className="flex items-center justify-between rounded-3xl border border-[color:var(--line)] bg-[color:var(--surface-glass)] px-5 py-4 transition hover:border-[color:var(--brand)] hover:bg-[color:var(--brand-softer)]"
    >
      <div>
        <div className="font-semibold text-[color:var(--foreground-strong)]">{label}</div>
        <div className="mt-1 text-sm text-[color:var(--muted)]">{copy}</div>
      </div>
      <ChevronRight className="h-5 w-5 text-[color:var(--brand)]" />
    </Link>
  );
}
