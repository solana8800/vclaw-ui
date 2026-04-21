import {
  Bot,
  BookOpenText,
  CreditCard,
  Download,
  Globe,
  LayoutDashboard,
  MapPinned,
  MessageSquareText,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
  Users,
} from "lucide-react";

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

type ValueCard = {
  value: string;
  label: string;
};

export type LandingContent = {
  hero: {
    badge: string;
    title: string;
    description: string;
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

export function LandingPage({ locale, content }: LandingPageProps) {
  const docsHref = getLocaleHref(locale, "/docs");
  const adminHref = getLocaleHref(locale, "/admin");

  return (
    <main>
      <section className="vclaw-grid-bg vclaw-hero-surface border-b border-[color:var(--line)] relative overflow-hidden">
        <div className="relative z-[3] vclaw-page-shell grid gap-8 py-16 sm:gap-10 sm:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
          <div>
            <Badge className="mb-6">{content.hero.badge}</Badge>
            <h1 className="max-w-3xl text-2xl font-bold tracking-tight text-[color:var(--hero-foreground)]">
              {content.hero.title}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-[color:var(--hero-muted)]">
              {content.hero.description}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href={adminHref} size="lg">
                <LayoutDashboard className="h-4 w-4" />
                {content.hero.primaryCta}
              </Button>
              {content.hero.secondaryCta && (
                <Button href={docsHref} size="lg" variant="outline">
                  <BookOpenText className="h-4 w-4" />
                  {content.hero.secondaryCta}
                </Button>
              )}
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {content.hero.summaryCards.map((card) => (
                <Card
                  key={card.title}
                  className="border-[color:var(--hero-card-border)] bg-[color:var(--hero-card)] shadow-none backdrop-blur"
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

          <Card className="vclaw-shimmer overflow-hidden border-[color:var(--hero-card-border)] bg-[color:var(--hero-card)] shadow-[0_42px_80px_-50px_var(--brand-glow)] backdrop-blur">
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
                className="group border-[color:var(--inverse-card-border)] bg-[color:var(--inverse-card)] shadow-none hover:bg-white/[0.08] transition-all duration-300 hover:translate-y-[-4px]"
              >
                <CardHeader>
                  <div className="h-12 w-12 rounded-2xl bg-[color:var(--brand-soft)] flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
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

      <section className="vclaw-page-shell py-20 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] items-center">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-[color:var(--brand)] to-purple-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
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
                  <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                    <span className="font-bold text-orange-600">S</span>
                  </div>
                  <span className="text-xs font-medium">Shopee</span>
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

      <section id="download" className="vclaw-grid-bg py-16 sm:py-24 border-y border-[color:var(--line)]">
        <div className="vclaw-page-shell">
          <Card className="vclaw-hero-surface border-[color:var(--hero-card-border)] shadow-[0_42px_80_px_-50px_var(--brand-glow)] overflow-hidden">
            <CardContent className="p-0 flex flex-col lg:flex-row">
              <div className="flex-1 p-8 sm:p-12">
                <Badge className="mb-6 bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)] border-none">
                  {content.download.badge}
                </Badge>
                <h2 className="text-3xl font-bold tracking-tight text-[color:var(--hero-foreground)] mb-4">
                  {content.download.title}
                </h2>
                <p className="text-lg text-[color:var(--hero-muted)] mb-8 max-w-xl">
                  {content.download.description}
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button 
                    href="https://github.com/solana8800/vclaw-app/releases/download/v0.1.0/VClawInstaller-0.1.0-arm64.pkg" 
                    size="lg"
                    className="h-14 px-8 text-base shadow-xl"
                  >
                    <Download className="h-5 w-5" />
                    {content.download.primaryCta}
                  </Button>
                  <Button 
                    href="https://github.com/solana8800/vclaw-app/releases/tag/v0.1.0" 
                    size="lg" 
                    variant="outline"
                    className="h-14 px-8 text-base border-[color:var(--hero-card-border)] text-[color:var(--hero-foreground)]"
                  >
                    <Globe className="h-5 w-5" />
                    {content.download.secondaryCta}
                  </Button>
                </div>
                <div className="mt-8 flex items-center gap-6 text-sm text-[color:var(--hero-muted)]">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {content.download.version}
                  </div>
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    {content.download.os}
                  </div>
                </div>
              </div>
              <div className="lg:w-[400px] bg-[image:var(--brand-gradient)] flex items-center justify-center p-12 relative overflow-hidden">
                <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]" />
                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className="h-24 w-24 rounded-[2rem] bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-2xl mb-6">
                    <Globe className="h-12 w-12 text-white" />
                  </div>
                  <div className="text-white font-bold text-xl drop-shadow-md">VClaw for Desktop</div>
                  <div className="text-white/80 text-sm mt-2">v0.1.0-beta</div>
                </div>
                {/* Decorative circles */}
                <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-[color:var(--brand-glow)] blur-3xl opacity-50" />
              </div>
            </CardContent>
          </Card>
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

      <section className="border-y border-[color:var(--line)] bg-[color:var(--surface-glass)] py-16 sm:py-20">
        <div className="vclaw-page-shell grid gap-10 lg:grid-cols-[1fr_1fr]">
          <Card>
            <CardHeader>
              <Globe className="h-6 w-6 text-[color:var(--brand-strong)]" />
              <CardTitle>{content.commerce.title}</CardTitle>
              <CardDescription>
                {content.commerce.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {content.commerce.steps.map((step, index) => (
                <div
                  key={step}
                  className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-4 py-3 text-sm text-[color:var(--foreground)]"
                >
                  {index + 1}. {step}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="vclaw-inverse-surface border-[color:var(--inverse-card-border)] text-[color:var(--inverse-foreground)]">
            <CardHeader>
              <Bot className="h-6 w-6 text-[color:var(--brand-strong)]" />
              <CardTitle className="text-[color:var(--inverse-foreground)]">
                {content.openClaw.title}
              </CardTitle>
              <CardDescription className="text-[color:var(--inverse-muted)]">
                {content.openClaw.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {content.openClaw.points.map((point) => (
                <div
                  key={point}
                  className="rounded-2xl border border-[color:var(--inverse-card-border)] bg-[color:var(--inverse-card)] px-4 py-3 text-sm text-[color:var(--inverse-foreground)]"
                >
                  {point}
                </div>
              ))}
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
              <Button href={adminHref} size="lg">
                <LayoutDashboard className="h-4 w-4" />
                {content.finalCta.primaryCta}
              </Button>
              {content.finalCta.secondaryCta && (
                <Button 
                  href="#download" 
                  size="lg" 
                  variant="outline"
                >
                  <Download className="h-4 w-4" />
                  {content.finalCta.secondaryCta}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
