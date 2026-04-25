import {
  Bot,
  BookOpenText,
  CheckCircle2,
  CreditCard,
  Download,
  Globe,
  LayoutDashboard,
  MessageSquareText,
  Share2,
  ShoppingBag,
  Sparkles,
  Store,
  Truck,
  Users,
} from "lucide-react";
import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getLocaleHref, type AppLocale } from "@/i18n/routing";
import { SpaceDecoration } from "@/components/marketing/space-decoration";
import vclawAppIcon from "@/app/icon.png";

type ValueCard = {
  value: string;
  label: string;
};

export type LandingContent = {
  hero: {
    badge: string;
    title: string;
    description: string;
    /** Dòng kênh bán hàng / thanh toán — tăng niềm tin thương mại điện tử */
    channelsLine: string;
    primaryCta: string;
    secondaryCta: string;
    summaryCards: Array<{ title: string; copy: string }>;
    cockpit: {
      title: string;
      description: string;
      stats: ValueCard[];
      inboxTitle: string;
      inboxItems: string[];
      workflowTitle: string;
      workflowSteps: string[];
    };
  };
  problem: {
    badge: string;
    title: string;
    description: string;
    cards: Array<{ title: string; copy: string }>;
  };
  capabilities: {
    badge: string;
    title: string;
    items: Array<{ title: string; description: string }>;
  };
  surfaces: {
    badge: string;
    title: string;
    description: string;
    items: Array<{ title: string; description: string }>;
  };
  commerce: {
    badge: string;
    title: string;
    description: string;
    steps: string[];
  };
  integrations: {
    badge: string;
    title: string;
    description: string;
    items: Array<{ title: string; description: string }>;
  };
  openClaw: {
    title: string;
    description: string;
    points: string[];
  };
  download: {
    badge: string;
    title: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
    version: string;
    os: string;
    desktopLabel: string;
  };
  finalCta: {
    badge: string;
    title: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
  };
};

type LandingPageProps = {
  locale: AppLocale;
  content: LandingContent;
};

const capabilityIcons = [
  Sparkles,
  LayoutDashboard,
  MessageSquareText,
  Truck,
];

const integrationIcons = [
  Share2,
  ShoppingBag,
  Truck,
  Bot,
];

const problemIcons = [MessageSquareText, CreditCard, Users];

const commerceStepIcons = [
  ShoppingBag,
  Sparkles,
  LayoutDashboard,
  CreditCard,
  CheckCircle2,
] as const;

export function LandingPage({ locale, content }: LandingPageProps) {
  const docsHref = getLocaleHref(locale, "/docs");
  const adminHref = getLocaleHref(locale, "/admin");
  const homeHref = getLocaleHref(locale, "/");
  const downloadHref = `${homeHref}#download`;

  return (
    <div className="relative">
      {/* Global Subtle Texture */}
      <div className="pointer-events-none absolute inset-0 z-[-1] overflow-hidden opacity-[0.05] dark:opacity-[0.08]">
        <Image
          src="/bamboo.jpg"
          alt=""
          fill
          className="object-cover grayscale"
          aria-hidden
        />
      </div>
      <section className="vclaw-grid-bg vclaw-hero-surface border-b border-[color:var(--line)] relative overflow-hidden">
        {/* Background Image Layer */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/bamboo.jpg"
            alt=""
            fill
            className="object-cover opacity-[0.15] dark:opacity-[0.25] grayscale-[0.1] mix-blend-multiply dark:mix-blend-overlay"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-[color:var(--brand-soft)] opacity-30" />
        </div>
        
        <div className="relative z-[3] vclaw-page-shell grid gap-10 py-20 sm:gap-12 sm:py-28 lg:grid-cols-[1.08fr_0.92fr] lg:py-32">
          <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500">
            <Badge className="mb-5 border-[color:var(--hero-card-border)] bg-[color:var(--hero-card)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--hero-muted)]">
              {content.hero.badge}
            </Badge>
            <h1 className="max-w-[22ch] text-balance text-3xl font-bold tracking-tight text-[color:var(--hero-foreground)] sm:text-4xl sm:leading-[1.12] lg:text-5xl lg:leading-[1.08]">
              {content.hero.title}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[color:var(--hero-muted)] sm:text-lg sm:leading-8">
              {content.hero.description}
            </p>
            <p className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-[color:var(--hero-foreground)]">
              <Store
                className="h-4 w-4 shrink-0 text-[color:var(--brand-strong)]"
                aria-hidden
              />
              <span className="text-[color:var(--hero-muted)]">
                {content.hero.channelsLine}
              </span>
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href={adminHref} size="lg" className="cursor-pointer px-7">
                <LayoutDashboard className="h-4 w-4" />
                {content.hero.primaryCta}
              </Button>
              {content.hero.secondaryCta ? (
                <Button
                  href={docsHref}
                  size="lg"
                  variant="outline"
                  className="cursor-pointer border-[color:var(--hero-card-border)] bg-[color:var(--hero-card)]/60 text-[color:var(--hero-foreground)] backdrop-blur hover:bg-[color:var(--hero-card)]"
                >
                  <BookOpenText className="h-4 w-4" />
                  {content.hero.secondaryCta}
                </Button>
              ) : null}
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {content.hero.summaryCards.map((card) => (
                <Card
                  key={card.title}
                  className="border-[color:var(--hero-card-border)] bg-[color:var(--hero-card)] shadow-none backdrop-blur transition-colors duration-200 hover:border-[color:var(--brand-soft)]"
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-[color:var(--hero-foreground)]">
                      {card.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-6 text-[color:var(--hero-muted)]">
                      {card.copy}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Card className="vclaw-shimmer motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-700 overflow-hidden border-[color:var(--hero-card-border)] bg-[color:var(--hero-card)] shadow-[0_42px_80px_-50px_var(--brand-glow)] backdrop-blur">
            <CardContent className="p-0">
              <div className="border-b border-[color:var(--hero-card-border)] px-6 py-4">
                <div className="text-sm font-semibold text-[color:var(--hero-foreground)]">
                  {content.hero.cockpit.title}
                </div>
                <div className="mt-1 text-sm text-[color:var(--hero-muted)]">
                  {content.hero.cockpit.description}
                </div>
              </div>
              <div className="grid gap-4 p-6">
                <div className="grid gap-4 md:grid-cols-3">
                  {content.hero.cockpit.stats.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-[color:var(--hero-card-border)] bg-[color:var(--hero-card)] p-4"
                    >
                      <div className="text-2xl font-semibold text-[color:var(--hero-foreground)]">
                        {stat.value}
                      </div>
                      <div className="mt-1 text-sm text-[color:var(--hero-muted)]">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-3xl border border-[color:var(--hero-card-border)] bg-[color:var(--surface-glass)] p-5">
                    <div className="mb-4 flex items-center gap-2 text-sm font-medium text-[color:var(--hero-foreground)]">
                      <MessageSquareText className="h-4 w-4 text-[color:var(--brand)]" />
                      {content.hero.cockpit.inboxTitle}
                    </div>
                    <div className="space-y-3">
                      {content.hero.cockpit.inboxItems.map((item) => (
                        <div
                          key={item}
                          className="rounded-2xl border border-[color:var(--hero-card-border)] bg-[color:var(--hero-card)] px-4 py-3 text-sm text-[color:var(--hero-muted)]"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-3xl border border-[color:var(--hero-accent-border)] bg-[image:var(--hero-accent-surface)] p-5">
                    <div className="mb-4 flex items-center gap-2 text-sm font-medium text-[color:var(--hero-accent-foreground)]">
                      <Sparkles className="h-4 w-4 text-[color:var(--brand-strong)]" />
                      {content.hero.cockpit.workflowTitle}
                    </div>
                    <ol className="space-y-3 text-sm text-[color:var(--hero-accent-muted)]">
                      {content.hero.cockpit.workflowSteps.map((step, index) => (
                        <li key={step}>
                          {index + 1}. {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="vclaw-page-shell relative overflow-hidden py-16 sm:py-20">
        <SpaceDecoration />
        <div className="max-w-3xl">
          <Badge className="mb-4">{content.problem.badge}</Badge>
          <h2 className="text-2xl font-bold tracking-tight text-[color:var(--foreground-strong)]">
            {content.problem.title}
          </h2>
          <p className="mt-4 text-base leading-7 text-[color:var(--muted)]">
            {content.problem.description}
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {content.problem.cards.map((problem, index) => {
            const Icon = problemIcons[index];

            return (
              <Card key={problem.title}>
                <CardHeader>
                  <Icon className="h-6 w-6 text-[color:var(--brand-strong)]" />
                  <CardTitle>{problem.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{problem.copy}</CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="vclaw-inverse-surface py-16 sm:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(209,50,56,0.1),transparent_50%)]" />
        <div className="vclaw-page-shell relative z-10">
          <div className="max-w-3xl">
            <Badge className="mb-4 border-[color:var(--inverse-card-border)] bg-[color:var(--inverse-card)] text-[color:var(--inverse-foreground)] px-4 py-1.5 text-sm">
              {content.capabilities.badge}
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[color:var(--inverse-foreground)]">
              {content.capabilities.title}
            </h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {content.capabilities.items.map((capability, index) => {
              const Icon = capabilityIcons[index] || Sparkles;

              return (
              <Card
                key={capability.title}
                className="group border-[color:var(--inverse-card-border)] bg-[color:var(--inverse-card)] shadow-none transition-all duration-200 hover:border-[color:var(--brand)]/35 hover:bg-white/[0.06] hover:shadow-[0_20px_50px_-28px_rgba(0,0,0,0.45)]"
              >
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--brand-soft)] transition-transform duration-200 group-hover:brightness-110">
                    <Icon className="h-6 w-6 text-[color:var(--brand-strong)]" />
                  </div>
                  <CardTitle className="text-xl text-[color:var(--inverse-foreground)]">{capability.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base text-[color:var(--inverse-muted)] leading-relaxed">
                    {capability.description}
                  </CardDescription>
                </CardContent>
              </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section
        className="border-y border-[color:var(--line)] bg-[color:var(--surface-soft)] py-16 sm:py-24"
        aria-labelledby="commerce-journey-heading"
      >
        <div className="vclaw-page-shell">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-4">{content.commerce.badge}</Badge>
            <h2
              id="commerce-journey-heading"
              className="text-balance text-2xl font-bold tracking-tight text-[color:var(--foreground-strong)] sm:text-3xl lg:text-4xl"
            >
              {content.commerce.title}
            </h2>
            <p className="mt-4 text-base leading-7 text-[color:var(--muted)] sm:text-lg">
              {content.commerce.description}
            </p>
          </div>
          <ol className="mx-auto mt-12 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {content.commerce.steps.map((step, index) => {
              const StepIcon =
                commerceStepIcons[index] ?? CheckCircle2;

              return (
                <li
                  key={step}
                  className="relative flex min-h-[8rem] flex-col rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] p-4 text-left shadow-sm transition-colors duration-200 hover:border-[color:var(--brand-soft)]"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--brand-soft)] text-sm font-bold text-[color:var(--brand-strong)]">
                      {index + 1}
                    </span>
                    <StepIcon
                      className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--brand)]"
                      aria-hidden
                    />
                  </div>
                  <p className="mt-3 text-sm font-medium leading-snug text-[color:var(--foreground-strong)]">
                    {step}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="vclaw-page-shell py-20 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] items-center">
          <div className="group relative">
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-[color:var(--brand)] to-purple-600 opacity-25 blur transition duration-500 group-hover:opacity-40" />
            <div className="relative bg-[color:var(--surface)] border border-[color:var(--line)] rounded-3xl p-8 shadow-2xl">
              <Badge className="mb-6">{content.integrations.badge}</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[color:var(--foreground-strong)] mb-6">
                {content.integrations.title}
              </h2>
              <p className="text-lg leading-8 text-[color:var(--muted)]">
                {content.integrations.description}
              </p>
              
              <div className="mt-10 flex flex-wrap gap-8 justify-center lg:justify-start opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
                {/* Placeholder logos or icons for visual flair */}
                <div className="flex flex-col items-center gap-2">
                  <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                    <span className="font-bold text-blue-600">Z</span>
                  </div>
                  <span className="text-xs font-medium">Zalo</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="h-12 w-12 rounded-full bg-blue-600/10 flex items-center justify-center border border-blue-600/20">
                    <span className="font-bold text-blue-700">f</span>
                  </div>
                  <span className="text-xs font-medium">Facebook</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-orange-500/20 bg-orange-500/10">
                    <span className="font-bold text-orange-600">S</span>
                  </div>
                  <span className="text-xs font-medium">Shopee</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-pink-500/25 bg-pink-500/10">
                    <span className="text-sm font-bold tracking-tight text-pink-600">
                      Tt
                    </span>
                  </div>
                  <span className="text-xs font-medium">TikTok</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <span className="font-bold text-emerald-600">G</span>
                  </div>
                  <span className="text-xs font-medium">GHTK</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {content.integrations.items.map((item, index) => {
              const Icon = integrationIcons[index] || Share2;
              return (
                <div key={item.title} className="vclaw-shimmer p-6 rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-glass)] hover:border-[color:var(--brand-soft)] transition-colors">
                  <div className="h-10 w-10 rounded-xl bg-[color:var(--surface-soft)] flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5 text-[color:var(--brand)]" />
                  </div>
                  <h3 className="font-bold text-[color:var(--foreground-strong)] mb-2">{item.title}</h3>
                  <p className="text-sm text-[color:var(--muted)] leading-relaxed">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>


      <section className="vclaw-page-shell py-16 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <Badge className="mb-4">{content.surfaces.badge}</Badge>
            <h2 className="text-2xl font-bold tracking-tight text-[color:var(--foreground-strong)]">
              {content.surfaces.title}
            </h2>
            <p className="mt-4 text-base leading-7 text-[color:var(--muted)]">
              {content.surfaces.description}
            </p>
          </div>
          <div className="grid gap-4">
            {content.surfaces.items.map((surface) => (
              <Card key={surface.title}>
                <CardHeader>
                  <CardTitle>{surface.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{surface.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="vclaw-inverse-surface border-y border-[color:var(--inverse-card-border)] py-16 sm:py-24">
        <div className="vclaw-page-shell">
          <Card className="mx-auto max-w-3xl border-[color:var(--inverse-card-border)] bg-[color:var(--inverse-card)] text-[color:var(--inverse-foreground)] shadow-[0_32px_80px_-48px_rgba(0,0,0,0.35)]">
            <CardHeader className="pb-2 sm:flex-row sm:items-start sm:gap-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--brand-soft)]">
                <Bot className="h-6 w-6 text-[color:var(--brand-strong)]" />
              </div>
              <div>
                <CardTitle className="text-xl text-[color:var(--inverse-foreground)] sm:text-2xl">
                  {content.openClaw.title}
                </CardTitle>
                <CardDescription className="mt-2 text-base text-[color:var(--inverse-muted)]">
                  {content.openClaw.description}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {content.openClaw.points.map((point) => (
                <div
                  key={point}
                  className="flex gap-3 rounded-2xl border border-[color:var(--inverse-card-border)] bg-[color:var(--surface)]/5 px-4 py-3 text-sm leading-relaxed text-[color:var(--inverse-foreground)]"
                >
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--brand-strong)]"
                    aria-hidden
                  />
                  {point}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section
        id="download"
        className="vclaw-grid-bg border-b border-[color:var(--line)] py-16 sm:py-24"
      >
        <div className="vclaw-page-shell">
          <Card className="vclaw-hero-surface overflow-hidden border-[color:var(--hero-card-border)] shadow-[0_42px_80px_-50px_var(--brand-glow)]">
            <CardContent className="flex flex-col p-0 lg:flex-row">
              <div className="flex-1 p-8 sm:p-12">
                <Badge className="mb-6 border-none bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)]">
                  {content.download.badge}
                </Badge>
                <h2 className="mb-4 text-3xl font-bold tracking-tight text-[color:var(--hero-foreground)]">
                  {content.download.title}
                </h2>
                <p className="mb-8 max-w-xl text-lg text-[color:var(--hero-muted)]">
                  {content.download.description}
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button
                    href="https://github.com/solana8800/vclaw/releases/download/v0.1.0/VClawInstaller-0.1.0-arm64.pkg"
                    size="lg"
                    className="h-14 cursor-pointer px-8 text-base shadow-xl"
                  >
                    <Download className="h-5 w-5" />
                    {content.download.primaryCta}
                  </Button>
                  <Button
                    href={docsHref}
                    size="lg"
                    variant="outline"
                    className="h-14 cursor-pointer border-[color:var(--hero-card-border)] px-8 text-base text-[color:var(--hero-foreground)]"
                  >
                    <BookOpenText className="h-5 w-5" />
                    {content.download.secondaryCta}
                  </Button>
                </div>
                <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-[color:var(--hero-muted)]">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {content.download.version}
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    {content.download.os}
                  </div>
                </div>
              </div>
              <div className="relative flex items-center justify-center bg-[image:var(--brand-gradient)] p-12 lg:w-[400px]">
                <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]" />
                <div className="relative z-10 flex min-h-[280px] w-full flex-col items-center justify-center text-center">
                  <div className="flex h-52 w-52 items-center justify-center rounded-[3.25rem] border border-white/30 bg-white/20 shadow-2xl backdrop-blur-md sm:h-56 sm:w-56 sm:rounded-[3.75rem]">
                    <Image
                      src={vclawAppIcon}
                      alt="Logo VClaw"
                      width={176}
                      height={176}
                      className="h-40 w-40 object-contain sm:h-44 sm:w-44"
                    />
                  </div>
                  <div className="mt-5">
                    <div className="text-xl font-bold text-white drop-shadow-md">
                      {content.download.desktopLabel}
                    </div>
                    <div className="mt-2 text-sm text-white/80">v0.1.0-beta</div>
                  </div>
                </div>
                <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[color:var(--brand-glow)] opacity-50 blur-3xl" />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="vclaw-page-shell py-16 sm:py-20">
        <Card className="vclaw-cta-surface overflow-hidden border-[color:var(--cta-border)] text-[color:var(--cta-foreground)] shadow-[0_42px_80px_-50px_var(--brand-glow)]">
          <CardContent className="flex flex-col gap-8 p-8 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <Badge className="mb-4 border-[color:var(--cta-border)] bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)]">
                {content.finalCta.badge}
              </Badge>
              <h2 className="text-2xl font-bold tracking-tight">
                {content.finalCta.title}
              </h2>
              <p className="mt-4 text-base leading-7 text-[color:var(--cta-muted)]">
                {content.finalCta.description}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button href={adminHref} size="lg" className="cursor-pointer">
                <LayoutDashboard className="h-4 w-4" />
                {content.finalCta.primaryCta}
              </Button>
              {content.finalCta.secondaryCta ? (
                <Button
                  href={downloadHref}
                  size="lg"
                  variant="outline"
                  className="cursor-pointer border-[color:var(--cta-border)] text-[color:var(--cta-foreground)]"
                >
                  <Download className="h-4 w-4" />
                  {content.finalCta.secondaryCta}
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
