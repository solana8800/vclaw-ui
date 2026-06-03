"use client";

import { useState, useEffect } from "react";
import {
  BookOpenText,
  CheckCircle2,
  ChevronDown,
  Download,
  MessageSquareText,
  CreditCard,
  Users,
  Sparkles,
  Share2,
  ShoppingBag,
  Truck,
  Bot,
  ArrowRight,
  Rocket,
  TrendingUp,
  Wallet,
  PenTool,
  Building,
  ShoppingCart,
  Gift,
  Apple,
  MonitorDown,
  Package,
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
import { INSTALLER_DOWNLOAD_URLS } from "@/lib/release/download-urls";

type DownloadOS = "macos" | "windows" | "ubuntu";

function detectOS(): DownloadOS {
  if (typeof navigator === "undefined") return "macos";
  const ua = `${navigator.userAgent} ${navigator.platform}`.toLowerCase();
  if (ua.includes("win")) return "windows";
  if (ua.includes("linux") || ua.includes("ubuntu")) return "ubuntu";
  return "macos";
}

const OS_META: Record<DownloadOS, { label: string; icon: typeof Apple }> = {
  macos: { label: "macOS", icon: Apple },
  windows: { label: "Windows", icon: MonitorDown },
  ubuntu: { label: "Ubuntu", icon: Package },
};

const DOWNLOAD_OS_ORDER: DownloadOS[] = ["macos", "windows", "ubuntu"];

function isDownloadOS(value: string | null): value is DownloadOS {
  return DOWNLOAD_OS_ORDER.includes(value as DownloadOS);
}

type ValueCard = {
  value: string;
  label: string;
};

type WorkspaceData = {
  hero: {
    badge: string;
    title: string;
    description: string;
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
  appShowcase: {
    badge: string;
    title: string;
    description: string;
    images: Array<{ caption: string; sub: string }>;
  };
  howItWorks: {
    badge: string;
    title: string;
    steps: Array<{ title: string; description: string }>;
  };
  integrations: {
    badge: string;
    title: string;
    description: string;
    items: Array<{ title: string; description: string }>;
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

export type LandingContent = {
  tabSelector: {
    title: string;
    description: string;
    commerce: {
      label: string;
      desc: string;
    };
    recruitment: {
      label: string;
      desc: string;
    };
  };
  commerce: WorkspaceData;
  recruitment: WorkspaceData;
  statsBar: { items: ValueCard[] };
  roadmap: {
    badge: string;
    comingSoonBadge: string;
    title: string;
    description: string;
    phases: Array<{ step: string; title: string; description: string; features: string[] }>;
  };
  faq: {
    badge: string;
    title: string;
    items: Array<{ question: string; answer: string }>;
  };
};

type LandingPageProps = {
  locale: AppLocale;
  content: LandingContent;
};

const problemIcons = [MessageSquareText, CreditCard, Users];
const integrationIcons = [Share2, ShoppingBag, Truck, Bot];
const roadmapIcons = [Wallet, PenTool, Building, ShoppingCart, Gift];
const howItWorksIcons = [MessageSquareText, CreditCard, Truck, Sparkles];

function DownloadButton({
  label,
  size = "default",
  os,
}: {
  label: string;
  size?: "default" | "lg";
  os: DownloadOS;
}) {
  const isLg = size === "lg";
  const OsIcon = OS_META[os].icon;
  return (
    <div className="relative inline-flex">
      <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-[color:var(--brand)] to-[color:var(--brand-strong)] opacity-50 blur animate-pulse" />
      <a
        href={INSTALLER_DOWNLOAD_URLS[os]}
        target="_blank"
        rel="noopener noreferrer"
        className={`relative inline-flex items-center justify-center gap-2 rounded-full font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)] border border-transparent bg-[image:var(--brand-gradient)] shadow-[0_24px_60px_-32px_var(--brand-glow)] hover:brightness-105 ring-2 ring-[color:var(--brand)]/30 hover:ring-[color:var(--brand)]/60 ${isLg ? "h-14 px-8 text-base" : "h-12 px-7 text-base"}`}
        style={{ color: "var(--brand-contrast)" }}
      >
        <OsIcon className={isLg ? "h-5 w-5" : "h-4 w-4"} />
        {label}
        <span className="opacity-80">· {OS_META[os].label}</span>
      </a>
    </div>
  );
}

function OsSwitcher({
  os,
  onChange,
  locale,
}: {
  os: DownloadOS;
  onChange: (next: DownloadOS) => void;
  locale: AppLocale;
}) {
  const otherOs =
    DOWNLOAD_OS_ORDER[(DOWNLOAD_OS_ORDER.indexOf(os) + 1) % DOWNLOAD_OS_ORDER.length];
  const OtherIcon = OS_META[otherOs].icon;
  const switchLabel =
    locale === "vi" ? `Đổi sang ${OS_META[otherOs].label}` : `Switch to ${OS_META[otherOs].label}`;
  return (
    <button
      type="button"
      onClick={() => onChange(otherOs)}
      className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-3 py-1.5 text-xs font-medium text-[color:var(--muted)] transition hover:border-[color:var(--brand)]/40 hover:text-[color:var(--foreground-strong)]"
    >
      <OtherIcon className="h-3.5 w-3.5" />
      {switchLabel}
    </button>
  );
}

export function LandingPage({ locale, content }: LandingPageProps) {
  const docsHref = getLocaleHref(locale, "/docs");
  const [activeTab, setActiveTab] = useState<"commerce" | "recruitment">("commerce");
  const [downloadOS, setDownloadOS] = useState<DownloadOS>("macos");

  useEffect(() => {
    // Chỉ đọc từ localStorage ở phía client sau khi component mount để tránh Hydration mismatch
    const saved = localStorage.getItem("vclaw_workspace");
    if (saved === "commerce" || saved === "recruitment") {
      setActiveTab(saved);
    }

    const savedOS = localStorage.getItem("vclaw_download_os");
    if (isDownloadOS(savedOS)) {
      setDownloadOS(savedOS);
    } else {
      setDownloadOS(detectOS());
    }
  }, []);

  const handleTabChange = (tab: "commerce" | "recruitment") => {
    setActiveTab(tab);
    localStorage.setItem("vclaw_workspace", tab);
  };

  const handleOSChange = (next: DownloadOS) => {
    setDownloadOS(next);
    localStorage.setItem("vclaw_download_os", next);
  };

  const workspace = activeTab === "commerce" ? content.commerce : content.recruitment;

  return (
    <div className="relative">
      {/* Global Subtle Texture */}
      <div className="pointer-events-none absolute inset-0 z-[-1] overflow-hidden opacity-[0.05] dark:opacity-[0.08]">
        <Image src="/bamboo.jpg" alt="" fill className="object-cover grayscale" aria-hidden />
      </div>

      {/* ── HERO ── */}
      <section className="vclaw-grid-bg vclaw-hero-surface border-b border-[color:var(--line)] relative overflow-hidden">
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

        {/* ── Workspace Selector dạng 2 cột Trái/Phải lớn ── */}
        <div className="relative z-10 vclaw-page-shell pt-16 sm:pt-20">
          <div className="text-center mb-8 max-w-2xl mx-auto">
            <h2 className="text-sm font-semibold tracking-wider text-[color:var(--brand-strong)] uppercase">
              {content.tabSelector.title}
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-[color:var(--muted)] leading-relaxed">
              {content.tabSelector.description}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 p-2 rounded-3xl bg-[color:var(--surface-soft)]/50 border border-[color:var(--line)]/60 backdrop-blur-md max-w-4xl mx-auto">
            {/* Cột Trái: Commerce */}
            <button
              onClick={() => handleTabChange("commerce")}
              className={`relative flex flex-col items-start p-6 text-left rounded-2xl transition-all duration-300 group overflow-hidden ${
                activeTab === "commerce"
                  ? "bg-[color:var(--surface)] border border-[color:var(--brand)]/30 shadow-[0_20px_40px_-15px_var(--brand-glow)] scale-[1.01]"
                  : "border border-transparent hover:bg-[color:var(--surface-soft)]/75 opacity-70 hover:opacity-100"
              }`}
            >
              {activeTab === "commerce" && (
                <div className="absolute top-0 right-0 h-20 w-20 bg-gradient-to-bl from-[color:var(--brand)]/15 to-transparent rounded-bl-full pointer-events-none" />
              )}
              <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-300 ${
                  activeTab === "commerce"
                    ? "bg-[color:var(--brand)] text-[color:var(--brand-contrast)] scale-110"
                    : "bg-[color:var(--surface-soft)] text-[color:var(--muted)] group-hover:text-[color:var(--foreground-strong)]"
                }`}>
                  <ShoppingBag className="h-5.5 w-5.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[color:var(--foreground-strong)] leading-snug">
                    {content.tabSelector.commerce.label}
                  </h3>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--brand-strong)]/80">
                    Workspace Commerce
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs sm:text-sm leading-relaxed text-[color:var(--muted)]">
                {content.tabSelector.commerce.desc}
              </p>
              {activeTab === "commerce" && (
                <div className="mt-4 flex items-center gap-1.5 text-[11px] font-semibold text-[color:var(--brand-strong)]">
                  <span>{locale === "vi" ? "Đang hiển thị" : "Showing"}</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--brand)] animate-ping" />
                </div>
              )}
            </button>

            {/* Cột Phải: Recruitment */}
            <button
              onClick={() => handleTabChange("recruitment")}
              className={`relative flex flex-col items-start p-6 text-left rounded-2xl transition-all duration-300 group overflow-hidden ${
                activeTab === "recruitment"
                  ? "bg-[color:var(--surface)] border border-[color:var(--brand)]/30 shadow-[0_20px_40px_-15px_var(--brand-glow)] scale-[1.01]"
                  : "border border-transparent hover:bg-[color:var(--surface-soft)]/75 opacity-70 hover:opacity-100"
              }`}
            >
              {activeTab === "recruitment" && (
                <div className="absolute top-0 right-0 h-20 w-20 bg-gradient-to-bl from-[color:var(--brand)]/15 to-transparent rounded-bl-full pointer-events-none" />
              )}
              <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-300 ${
                  activeTab === "recruitment"
                    ? "bg-[color:var(--brand)] text-[color:var(--brand-contrast)] scale-110"
                    : "bg-[color:var(--surface-soft)] text-[color:var(--muted)] group-hover:text-[color:var(--foreground-strong)]"
                }`}>
                  <Users className="h-5.5 w-5.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[color:var(--foreground-strong)] leading-snug">
                    {content.tabSelector.recruitment.label}
                  </h3>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--brand-strong)]/80">
                    Workspace Recruitment
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs sm:text-sm leading-relaxed text-[color:var(--muted)]">
                {content.tabSelector.recruitment.desc}
              </p>
              {activeTab === "recruitment" && (
                <div className="mt-4 flex items-center gap-1.5 text-[11px] font-semibold text-[color:var(--brand-strong)]">
                  <span>{locale === "vi" ? "Đang hiển thị" : "Showing"}</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--brand)] animate-ping" />
                </div>
              )}
            </button>
          </div>
        </div>

        <div className="relative z-[3] vclaw-page-shell grid gap-10 pb-20 pt-12 sm:gap-12 sm:pb-28 lg:grid-cols-[1.08fr_0.92fr] lg:pb-32">
          <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500">
            <Badge className="mb-5 border-[color:var(--hero-card-border)] bg-[color:var(--hero-card)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--hero-muted)]">
              {workspace.hero.badge}
            </Badge>
            <h1 className="max-w-[22ch] text-balance text-3xl font-bold tracking-tight text-[color:var(--hero-foreground)] sm:text-4xl sm:leading-[1.12] lg:text-5xl lg:leading-[1.08]">
              {workspace.hero.title}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[color:var(--hero-muted)] sm:text-lg sm:leading-8">
              {workspace.hero.description}
            </p>

            <p className="mt-5 text-xs text-[color:var(--hero-muted)]/80 font-medium">
              {workspace.hero.channelsLine}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <DownloadButton label={workspace.hero.primaryCta} os={downloadOS} />
              {workspace.hero.secondaryCta ? (
                <Button
                  href={docsHref}
                  size="lg"
                  variant="outline"
                  className="cursor-pointer border-[color:var(--hero-card-border)] bg-[color:var(--hero-card)]/60 text-[color:var(--hero-foreground)] backdrop-blur hover:bg-[color:var(--hero-card)]"
                >
                  <BookOpenText className="h-4 w-4" />
                  {workspace.hero.secondaryCta}
                </Button>
              ) : null}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[color:var(--hero-muted)]">
              <span>
                {locale === "vi"
                  ? "Có sẵn cho Windows và macOS."
                  : "Available for Windows and macOS."}
              </span>
              <OsSwitcher os={downloadOS} onChange={handleOSChange} locale={locale} />
            </div>
          </div>

          {/* Hero right: cockpit mock */}
          <Card className="vclaw-shimmer motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-700 overflow-hidden border-[color:var(--hero-card-border)] bg-[color:var(--hero-card)] shadow-[0_42px_80px_-50px_var(--brand-glow)] backdrop-blur">
            <CardContent className="p-0">
              <div className="border-b border-[color:var(--hero-card-border)] px-6 py-4">
                <div className="text-sm font-semibold text-[color:var(--hero-foreground)]">
                  {workspace.hero.cockpit.title}
                </div>
                <div className="mt-1 text-sm text-[color:var(--hero-muted)]">
                  {workspace.hero.cockpit.description}
                </div>
              </div>
              <div className="grid gap-4 p-6">
                <div className="grid gap-3 grid-cols-3">
                  {workspace.hero.cockpit.stats.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-[color:var(--hero-card-border)] bg-[color:var(--hero-card)] p-3 text-center"
                    >
                      <div className="text-xl font-bold text-[color:var(--hero-foreground)]">
                        {stat.value}
                      </div>
                      <div className="mt-0.5 text-xs text-[color:var(--hero-muted)]">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-2xl border border-[color:var(--hero-card-border)] bg-[color:var(--surface-glass)] p-4">
                    <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-[color:var(--hero-foreground)]">
                      <MessageSquareText className="h-3.5 w-3.5 text-[color:var(--brand)]" />
                      {workspace.hero.cockpit.inboxTitle}
                    </div>
                    <div className="space-y-2">
                      {workspace.hero.cockpit.inboxItems.map((item) => (
                        <div
                          key={item}
                          className="rounded-xl border border-[color:var(--hero-card-border)] bg-[color:var(--hero-card)] px-3 py-2 text-xs text-[color:var(--hero-muted)]"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[color:var(--hero-accent-border)] bg-[image:var(--hero-accent-surface)] p-4">
                    <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-[color:var(--hero-accent-foreground)]">
                      <Sparkles className="h-3.5 w-3.5 text-[color:var(--brand-strong)]" />
                      {workspace.hero.cockpit.workflowTitle}
                    </div>
                    <ol className="space-y-2 text-xs text-[color:var(--hero-accent-muted)]">
                      {workspace.hero.cockpit.workflowSteps.map((step, i) => (
                        <li key={step}>
                          {i + 1}. {step}
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

      {/* ── STATS BAR ── */}
      <div className="border-b border-[color:var(--line)] bg-[color:var(--surface-soft)]">
        <div className="vclaw-page-shell">
          <dl className="grid grid-cols-2 divide-x divide-[color:var(--line)] md:grid-cols-4">
            {content.statsBar.items.map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-1 py-5 px-4 text-center">
                <dt className="text-2xl font-bold text-[color:var(--foreground-strong)]">{item.value}</dt>
                <dd className="text-sm text-[color:var(--muted)]">{item.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* ── PROBLEM ── */}
      <section className="vclaw-page-shell relative overflow-hidden py-14 sm:py-20">
        <SpaceDecoration />
        <div className="max-w-2xl">
          <Badge className="mb-4">{workspace.problem.badge}</Badge>
          <h2 className="text-2xl font-bold tracking-tight text-[color:var(--foreground-strong)] sm:text-3xl">
            {workspace.problem.title}
          </h2>
          <p className="mt-3 text-base leading-7 text-[color:var(--muted)]">
            {workspace.problem.description}
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {workspace.problem.cards.map((card, i) => {
            const Icon = problemIcons[i] || MessageSquareText;
            return (
              <Card key={card.title}>
                <CardHeader className="pb-2">
                  <Icon className="h-5 w-5 text-[color:var(--brand-strong)]" />
                  <CardTitle className="text-base">{card.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{card.copy}</CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ── APP SHOWCASE ── */}
      <section className="border-y border-[color:var(--line)] bg-[color:var(--surface-soft)] py-14 sm:py-20">
        <div className="vclaw-page-shell">
          <div className="mx-auto max-w-2xl text-center">
            <Badge className="mb-4">{workspace.appShowcase.badge}</Badge>
            <h2 className="text-2xl font-bold tracking-tight text-[color:var(--foreground-strong)] sm:text-3xl">
              {workspace.appShowcase.title}
            </h2>
            <p className="mt-3 text-base leading-7 text-[color:var(--muted)]">
              {workspace.appShowcase.description}
            </p>
          </div>

          {/* Render images dynamically based on selected workspace */}
          {(() => {
            const commerceSrcs = [
              "/docs/assets/vclaw-omnichannel-flow.png",
              "/docs/assets/vclaw-marketing-flow.png",
              "/docs/assets/vclaw-customer-care-flow.png",
            ];
            const recruitmentSrcs = [
              "/docs/assets/vclaw_dashboard_main.png",
              "/docs/assets/vclaw_browser_tabs.png",
              "/docs/assets/vclaw_onboarding.png",
            ];
            const showcaseSrcs = activeTab === "commerce" ? commerceSrcs : recruitmentSrcs;

            return (
              <div className="mt-10 grid gap-6 sm:grid-cols-3">
                {workspace.appShowcase.images.map((img, i) => (
                  <div key={img.caption} className="group flex flex-col gap-3">
                    <div className="overflow-hidden rounded-2xl border border-[color:var(--line)] shadow-lg transition-transform duration-300 group-hover:-translate-y-1 group-hover:shadow-xl">
                      <Image
                        src={showcaseSrcs[i] || "/bamboo.jpg"}
                        alt={img.caption}
                        width={600}
                        height={600}
                        className="w-full object-cover"
                      />
                    </div>
                    <div className="px-1">
                      <div className="font-semibold text-[color:var(--foreground-strong)]">
                        {img.caption}
                      </div>
                      <p className="mt-0.5 text-sm text-[color:var(--muted)]">{img.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="vclaw-page-shell py-14 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <Badge className="mb-4">{workspace.howItWorks.badge}</Badge>
          <h2 className="text-2xl font-bold tracking-tight text-[color:var(--foreground-strong)] sm:text-3xl">
            {workspace.howItWorks.title}
          </h2>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {workspace.howItWorks.steps.map((step, i) => {
            const Icon = howItWorksIcons[i] || MessageSquareText;
            return (
              <div
                key={step.title}
                className="relative flex flex-col gap-4 rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] p-6 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--brand-soft)]">
                    <Icon className="h-5 w-5 text-[color:var(--brand-strong)]" />
                  </div>
                  <span className="text-3xl font-black text-[color:var(--brand-soft)] select-none">
                    {i + 1}
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-[color:var(--foreground-strong)]">
                    {step.title}
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--muted)]">
                    {step.description}
                  </p>
                </div>
                {i < workspace.howItWorks.steps.length - 1 && (
                  <div className="absolute -right-2 top-1/2 hidden -translate-y-1/2 text-[color:var(--muted)] lg:block">
                    →
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── INTEGRATIONS ── */}
      <section className="vclaw-inverse-surface py-14 sm:py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(209,50,56,0.1),transparent_50%)]" />
        <div className="vclaw-page-shell relative z-10">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="overflow-hidden rounded-2xl shadow-2xl">
              <Image
                src="/docs/assets/vclaw-vision-hub.png"
                alt="VClaw kết nối đa hệ sinh thái"
                width={800}
                height={800}
                className="w-full object-cover"
              />
            </div>
            <div>
              <Badge className="mb-4 border-[color:var(--inverse-card-border)] bg-[color:var(--inverse-card)] text-[color:var(--inverse-foreground)] px-4 py-1.5">
                {workspace.integrations.badge}
              </Badge>
              <h2 className="text-2xl font-bold tracking-tight text-[color:var(--inverse-foreground)] sm:text-3xl">
                {workspace.integrations.title}
              </h2>
              <p className="mt-3 text-base leading-7 text-[color:var(--inverse-muted)]">
                {workspace.integrations.description}
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {workspace.integrations.items.map((item, i) => {
                  const Icon = integrationIcons[i] || Share2;
                  return (
                    <div
                      key={item.title}
                      className="flex gap-3 rounded-xl border border-[color:var(--inverse-card-border)] bg-[color:var(--inverse-card)] p-4"
                    >
                      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--brand-strong)]" />
                      <div>
                        <div className="text-sm font-semibold text-[color:var(--inverse-foreground)]">
                          {item.title}
                        </div>
                        <p className="mt-0.5 text-xs leading-relaxed text-[color:var(--inverse-muted)]">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ROADMAP ── */}
      <section className="border-y border-[color:var(--line)] bg-[color:var(--surface-soft)] py-14 sm:py-20">
        <div className="vclaw-page-shell">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:items-center">
            <div>
              <Badge className="mb-4">{content.roadmap.badge}</Badge>
              <h2 className="text-2xl font-bold tracking-tight text-[color:var(--foreground-strong)] sm:text-3xl">
                {content.roadmap.title}
              </h2>
              <p className="mt-3 text-base leading-7 text-[color:var(--muted)]">
                {content.roadmap.description}
              </p>
              <div className="mt-8 overflow-hidden rounded-2xl border border-[color:var(--line)] shadow-lg">
                <Image
                  src="/docs/assets/vclaw-ai-growth.png"
                  alt="VClaw AI tăng trưởng"
                  width={600}
                  height={600}
                  className="w-full object-cover"
                />
              </div>
            </div>
            <div className="space-y-4">
              {content.roadmap.phases.map((phase, i) => {
                const Icon = roadmapIcons[i] || Wallet;
                return (
                  <div
                    key={phase.step}
                    className="relative rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] p-6 transition-all hover:border-[color:var(--brand)]/40 hover:bg-[color:var(--surface-soft)] hover:shadow-lg group"
                  >
                    <span className="absolute right-4 top-4 rounded-full border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-2.5 py-0.5 text-[10px] font-bold text-[color:var(--muted)] uppercase tracking-wider group-hover:bg-[color:var(--brand)] group-hover:text-white group-hover:border-transparent transition-colors">
                      {content.roadmap.comingSoonBadge}
                    </span>
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--surface-soft)] group-hover:bg-[color:var(--brand)] transition-colors">
                        <Icon className="h-5 w-5 text-[color:var(--muted)] group-hover:text-white transition-colors" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-[color:var(--brand-strong)]">
                          {phase.step}
                        </div>
                        <div className="mt-1 text-lg font-bold text-[color:var(--foreground-strong)]">
                          {phase.title}
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted)]">
                          {phase.description}
                        </p>
                        {phase.features && phase.features.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {phase.features.map((feat) => (
                              <span
                                key={feat}
                                className="inline-flex items-center rounded-md border border-[color:var(--brand)]/20 bg-[color:var(--brand)]/5 px-2 py-1 text-[10px] font-semibold text-[color:var(--brand-strong)] transition-colors group-hover:bg-[color:var(--brand)]/10"
                              >
                                {feat}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── DOWNLOAD ── */}
      <section id="download" className="vclaw-grid-bg border-b border-[color:var(--line)] py-14 sm:py-20">
        <div className="vclaw-page-shell">
          <Card className="vclaw-hero-surface overflow-hidden border-[color:var(--hero-card-border)] shadow-[0_42px_80px_-50px_var(--brand-glow)]">
            <CardContent className="flex flex-col p-0 lg:flex-row">
              <div className="flex-1 p-8 sm:p-12">
                <Badge className="mb-6 border-none bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)]">
                  {workspace.download.badge}
                </Badge>
                <h2 className="mb-4 text-3xl font-bold tracking-tight text-[color:var(--hero-foreground)]">
                  {workspace.download.title}
                </h2>
                <p className="mb-8 max-w-xl text-lg text-[color:var(--hero-muted)]">
                  {workspace.download.description}
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  <DownloadButton label={workspace.download.primaryCta} size="lg" os={downloadOS} />
                  <OsSwitcher os={downloadOS} onChange={handleOSChange} locale={locale} />
                  {workspace.download.secondaryCta ? (
                    <Button
                      href={docsHref}
                      size="lg"
                      variant="outline"
                      className="h-14 cursor-pointer border-[color:var(--hero-card-border)] px-8 text-base text-[color:var(--hero-foreground)]"
                    >
                      <BookOpenText className="h-5 w-5" />
                      {workspace.download.secondaryCta}
                    </Button>
                  ) : null}
                </div>
                <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-[color:var(--hero-muted)]">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {workspace.download.version}
                  </div>
                  <div className="flex items-center gap-2">
                    <Apple className="h-4 w-4" />
                    macOS · Apple Silicon
                  </div>
                  <div className="flex items-center gap-2">
                    <MonitorDown className="h-4 w-4" />
                    Windows 10/11 · x64
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Ubuntu/Debian · x64
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-semibold text-emerald-400">
                    100% {locale === "vi" ? "Miễn phí" : "Free"}
                  </div>
                </div>
              </div>
              <div className="relative flex items-center justify-center bg-[image:var(--brand-gradient)] p-12 lg:w-[380px]">
                <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]" />
                <div className="relative z-10 flex flex-col items-center justify-center text-center">
                  <div className="flex h-48 w-48 items-center justify-center rounded-[3.25rem] border border-white/30 bg-white/20 shadow-2xl backdrop-blur-md">
                    <Image
                      src={vclawAppIcon}
                      alt="Logo VClaw"
                      width={160}
                      height={160}
                      className="h-36 w-36 object-contain"
                    />
                  </div>
                  <div className="mt-5 text-xl font-bold text-white drop-shadow-md">
                    {workspace.download.desktopLabel}
                  </div>
                  <div className="mt-1 text-sm text-white/70">{workspace.download.version}</div>
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                    <Apple className="h-3.5 w-3.5" />
                    macOS
                    <span className="opacity-60">·</span>
                    <MonitorDown className="h-3.5 w-3.5" />
                    Windows
                    <span className="opacity-60">·</span>
                    <Package className="h-3.5 w-3.5" />
                    Ubuntu
                  </div>
                </div>
                <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[color:var(--brand-glow)] opacity-50 blur-3xl" />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="vclaw-page-shell py-14 sm:py-20" aria-labelledby="faq-heading">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <Badge className="mb-4">{content.faq.badge}</Badge>
            <h2
              id="faq-heading"
              className="text-2xl font-bold tracking-tight text-[color:var(--foreground-strong)] sm:text-3xl"
            >
              {content.faq.title}
            </h2>
          </div>
          <div className="mt-8 space-y-2">
            {content.faq.items.map((item, i) => (
              <details
                key={item.question}
                className="group rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] overflow-hidden"
                open={i === 0}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 font-semibold text-[color:var(--foreground-strong)] hover:bg-[color:var(--surface-soft)] transition-colors">
                  <span>{item.question}</span>
                  <ChevronDown
                    className="h-5 w-5 shrink-0 text-[color:var(--muted)] transition-transform duration-200 group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <div className="px-6 pb-5 pt-1 text-base leading-relaxed text-[color:var(--muted)]">
                  {item.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="vclaw-page-shell pb-16 sm:pb-20">
        <Card className="vclaw-cta-surface overflow-hidden border-[color:var(--cta-border)] text-[color:var(--cta-foreground)] shadow-[0_42px_80px_-50px_var(--brand-glow)]">
          <CardContent className="flex flex-col gap-8 p-8 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <Badge className="mb-4 border-[color:var(--cta-border)] bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)]">
                {workspace.finalCta.badge}
              </Badge>
              <h2 className="text-2xl font-bold tracking-tight">{workspace.finalCta.title}</h2>
              <p className="mt-3 text-base leading-7 text-[color:var(--cta-muted)]">
                {workspace.finalCta.description}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <DownloadButton label={workspace.finalCta.primaryCta} os={downloadOS} />
              <OsSwitcher os={downloadOS} onChange={handleOSChange} locale={locale} />
              {workspace.finalCta.secondaryCta ? (
                <Button
                  href={docsHref}
                  size="lg"
                  variant="outline"
                  className="cursor-pointer border-[color:var(--cta-border)] text-[color:var(--cta-foreground)]"
                >
                  <ArrowRight className="h-4 w-4" />
                  {workspace.finalCta.secondaryCta}
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
