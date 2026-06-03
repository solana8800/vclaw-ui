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

function LinuxIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      {...props}
    >
      <title>Linux</title>
      <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.132 1.884 1.071.771-.06 1.592-.536 2.257-1.306.631-.765 1.683-1.084 2.378-1.503.348-.199.629-.469.649-.853.023-.4-.2-.811-.714-1.376v-.097l-.003-.003c-.17-.2-.25-.535-.338-.926-.085-.401-.182-.786-.492-1.046h-.003c-.059-.054-.123-.067-.188-.135a.357.357 0 00-.19-.064c.431-1.278.264-2.55-.173-3.694-.533-1.41-1.465-2.638-2.175-3.483-.796-1.005-1.576-1.957-1.56-3.368.026-2.152.236-6.133-3.544-6.139zm.529 3.405h.013c.213 0 .396.062.584.198.19.135.33.332.438.533.105.259.158.459.166.724 0-.02.006-.04.006-.06v.105a.086.086 0 01-.004-.021l-.004-.024a1.807 1.807 0 01-.15.706.953.953 0 01-.213.335.71.71 0 00-.088-.042c-.104-.045-.198-.064-.284-.133a1.312 1.312 0 00-.22-.066c.05-.06.146-.133.183-.198.053-.128.082-.264.088-.402v-.02a1.21 1.21 0 00-.061-.4c-.045-.134-.101-.2-.183-.333-.084-.066-.167-.132-.267-.132h-.016c-.093 0-.176.03-.262.132a.8.8 0 00-.205.334 1.18 1.18 0 00-.09.4v.019c.002.089.008.179.02.267-.193-.067-.438-.135-.607-.202a1.635 1.635 0 01-.018-.2v-.02a1.772 1.772 0 01.15-.768c.082-.22.232-.406.43-.533a.985.985 0 01.594-.2zm-2.962.059h.036c.142 0 .27.048.399.135.146.129.264.288.344.465.09.199.14.4.153.667v.004c.007.134.006.2-.002.266v.08c-.03.007-.056.018-.083.024-.152.055-.274.135-.393.2.012-.09.013-.18.003-.267v-.015c-.012-.133-.04-.2-.082-.333a.613.613 0 00-.166-.267.248.248 0 00-.183-.064h-.021c-.071.006-.13.04-.186.132a.552.552 0 00-.12.27.944.944 0 00-.023.33v.015c.012.135.037.2.08.334.046.134.098.2.166.268.01.009.02.018.034.024-.07.057-.117.07-.176.136a.304.304 0 01-.131.068 2.62 2.62 0 01-.275-.402 1.772 1.772 0 01-.155-.667 1.759 1.759 0 01.08-.668 1.43 1.43 0 01.283-.535c.128-.133.26-.2.418-.2zm1.37 1.706c.332 0 .733.065 1.216.399.293.2.523.269 1.052.468h.003c.255.136.405.266.478.399v-.131a.571.571 0 01.016.47c-.123.31-.516.643-1.063.842v.002c-.268.135-.501.333-.775.465-.276.135-.588.292-1.012.267a1.139 1.139 0 01-.448-.067 3.566 3.566 0 01-.322-.198c-.195-.135-.363-.332-.612-.465v-.005h-.005c-.4-.246-.616-.512-.686-.71-.07-.268-.005-.47.193-.6.224-.135.38-.271.483-.336.104-.074.143-.102.176-.131h.002v-.003c.169-.202.436-.47.839-.601.139-.036.294-.065.466-.065zm2.8 2.142c.358 1.417 1.196 3.475 1.735 4.473.286.534.855 1.659 1.102 3.024.156-.005.33.018.513.064.646-1.671-.546-3.467-1.089-3.966-.22-.2-.232-.335-.123-.335.59.534 1.365 1.572 1.646 2.757.13.535.16 1.104.021 1.67.067.028.135.06.205.067 1.032.534 1.413.938 1.23 1.537v-.043c-.06-.003-.12 0-.18 0h-.016c.151-.467-.182-.825-1.065-1.224-.915-.4-1.646-.336-1.77.465-.008.043-.013.066-.018.135-.068.023-.139.053-.209.064-.43.268-.662.669-.793 1.187-.13.533-.17 1.156-.205 1.869v.003c-.02.334-.17.838-.319 1.35-1.5 1.072-3.58 1.538-5.348.334a2.645 2.645 0 00-.402-.533 1.45 1.45 0 00-.275-.333c.182 0 .338-.03.465-.067a.615.615 0 00.314-.334c.108-.267 0-.697-.345-1.163-.345-.467-.931-.995-1.788-1.521-.63-.4-.986-.87-1.15-1.396-.165-.534-.143-1.085-.015-1.645.245-1.07.873-2.11 1.274-2.763.107-.065.037.135-.408.974-.396.751-1.14 2.497-.122 3.854a8.123 8.123 0 01.647-2.876c.564-1.278 1.743-3.504 1.836-5.268.048.036.217.135.289.202.218.133.38.333.59.465.21.201.477.335.876.335.039.003.075.006.11.006.412 0 .73-.134.997-.268.29-.134.52-.334.74-.4h.005c.467-.135.835-.402 1.044-.7zm2.185 8.958c.037.6.343 1.245.882 1.377.588.134 1.434-.333 1.791-.765l.211-.01c.315-.007.577.01.847.268l.003.003c.208.199.305.53.391.876.085.4.154.78.409 1.066.486.527.645.906.636 1.14l.003-.007v.018l-.003-.012c-.015.262-.185.396-.498.595-.63.401-1.746.712-2.457 1.57-.618.737-1.37 1.14-2.036 1.191-.664.053-1.237-.2-1.574-.898l-.005-.003c-.21-.4-.12-1.025.056-1.69.176-.668.428-1.344.463-1.897.037-.714.076-1.335.195-1.814.12-.465.308-.797.641-.984l.045-.022zm-10.814.049h.01c.053 0 .105.005.157.014.376.055.706.333 1.023.752l.91 1.664.003.003c.243.533.754 1.064 1.189 1.637.434.598.77 1.131.729 1.57v.006c-.057.744-.48 1.148-1.125 1.294-.645.135-1.52.002-2.395-.464-.968-.536-2.118-.469-2.857-.602-.369-.066-.61-.2-.723-.4-.11-.2-.113-.602.123-1.23v-.004l.002-.003c.117-.334.03-.752-.027-1.118-.055-.401-.083-.71.043-.94.16-.334.396-.4.69-.533.294-.135.64-.202.915-.47h.002v-.002c.256-.268.445-.601.668-.838.19-.201.38-.336.663-.336zm7.159-9.074c-.435.201-.945.535-1.488.535-.542 0-.97-.267-1.28-.466-.154-.134-.28-.268-.373-.335-.164-.134-.144-.333-.074-.333.109.016.129.134.199.2.096.066.215.2.36.333.292.2.68.467 1.167.467.485 0 1.053-.267 1.398-.466.195-.135.445-.334.648-.467.156-.136.149-.267.279-.267.128.016.034.134-.147.332a8.097 8.097 0 01-.69.468zm-1.082-1.583V5.64c-.006-.02.013-.042.029-.05.074-.043.18-.027.26.004.063 0 .16.067.15.135-.006.049-.085.066-.135.066-.055 0-.092-.043-.141-.068-.052-.018-.146-.008-.163-.065zm-.551 0c-.02.058-.113.049-.166.066-.047.025-.086.068-.14.068-.05 0-.13-.02-.136-.068-.01-.066.088-.133.15-.133.08-.031.184-.047.259-.005.019.009.036.03.03.05v.02h.003z" />
    </svg>
  );
}

const OS_META: Record<DownloadOS, { label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }> = {
  macos: { label: "macOS", icon: Apple },
  windows: { label: "Windows", icon: MonitorDown },
  ubuntu: { label: "Ubuntu", icon: LinuxIcon },
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

function DownloadButtonGroup({
  size = "default",
  primaryCtaText,
  activeOS,
  onOSChange,
  locale,
  theme = "hero",
}: {
  size?: "default" | "lg";
  primaryCtaText: string;
  activeOS: DownloadOS;
  onOSChange: (os: DownloadOS) => void;
  locale: AppLocale;
  theme?: "hero" | "download-section" | "final-cta";
}) {
  const isLg = size === "lg";

  return (
    <div className="flex flex-wrap items-center gap-3">
      {DOWNLOAD_OS_ORDER.map((os) => {
        const isActive = os === activeOS;
        const OsIcon = OS_META[os].icon;
        const osLabel = OS_META[os].label;
        const btnLabel = locale === "vi" ? `Tải cho ${osLabel}` : `Download for ${osLabel}`;

        if (isActive) {
          return (
            <div key={os} className="relative inline-flex" style={{ zIndex: 2 }}>
              {/* Hiệu ứng viền phát sáng động khi di chuột và xung quanh nút chính */}
              <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-[color:var(--brand)] to-[color:var(--brand-strong)] opacity-50 blur animate-pulse" />
              <a
                href={INSTALLER_DOWNLOAD_URLS[os]}
                target="_blank"
                rel="noopener noreferrer"
                className={`relative inline-flex items-center justify-center gap-2 rounded-full font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)] border border-transparent bg-[image:var(--brand-gradient)] shadow-[0_24px_60px_-32px_var(--brand-glow)] hover:brightness-105 ring-2 ring-[color:var(--brand)]/30 hover:ring-[color:var(--brand)]/60 ${
                  isLg ? "h-14 px-8 text-base" : "h-12 px-7 text-base"
                }`}
                style={{ color: "var(--brand-contrast)" }}
                onClick={() => onOSChange(os)}
              >
                <OsIcon className={isLg ? "h-5 w-5" : "h-4 w-4"} />
                {primaryCtaText}
                <span className="opacity-80">· {osLabel}</span>
              </a>
            </div>
          );
        }

        // Các nút của các hệ điều hành khác được hiển thị dưới dạng nút phụ (outline) để người dùng có thể click tải trực tiếp
        const baseClasses = "inline-flex items-center justify-center gap-2 rounded-full font-semibold border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)]";
        const sizeClasses = isLg ? "h-14 px-7 text-base" : "h-12 px-6 text-base";

        let themeClasses = "";
        let iconColorClass = "";
        if (theme === "hero") {
          themeClasses = "border-[color:var(--hero-card-border)] bg-[color:var(--hero-card)]/40 text-[color:var(--hero-foreground)] backdrop-blur-sm hover:bg-[color:var(--hero-card)]/80 hover:border-[color:var(--brand)]/30 hover:shadow-md";
          iconColorClass = "text-[color:var(--hero-muted)] group-hover:text-[color:var(--hero-foreground)]";
        } else if (theme === "download-section") {
          themeClasses = "border-[color:var(--hero-card-border)] bg-[color:var(--hero-card)]/40 text-[color:var(--hero-foreground)] backdrop-blur-sm hover:bg-[color:var(--hero-card)]/80 hover:border-[color:var(--brand)]/30 hover:shadow-md";
          iconColorClass = "text-[color:var(--hero-muted)] group-hover:text-[color:var(--hero-foreground)]";
        } else if (theme === "final-cta") {
          themeClasses = "border-[color:var(--cta-border)] bg-transparent text-[color:var(--cta-foreground)] hover:bg-[color:var(--cta-foreground)]/10 hover:border-[color:var(--brand)]/30 hover:shadow-md";
          iconColorClass = "text-[color:var(--cta-muted)] group-hover:text-[color:var(--cta-foreground)]";
        }

        return (
          <a
            key={os}
            href={INSTALLER_DOWNLOAD_URLS[os]}
            target="_blank"
            rel="noopener noreferrer"
            className={`${baseClasses} ${themeClasses} ${sizeClasses} group`}
            onClick={() => onOSChange(os)}
          >
            <OsIcon className={`${isLg ? "h-5 w-5" : "h-4 w-4"} ${iconColorClass} transition-colors`} />
            <span>{btnLabel}</span>
          </a>
        );
      })}
    </div>
  );
}


export function LandingPage({ locale, content }: LandingPageProps) {
  const docsHref = getLocaleHref(locale, "/docs");
  const [activeTab, setActiveTab] = useState<"commerce" | "recruitment">("commerce");
  const [downloadOS, setDownloadOS] = useState<DownloadOS>("macos");

  useEffect(() => {
    // Chỉ đọc từ localStorage ở phía client sau khi component mount để tránh Hydration mismatch
    // Ưu tiên đồng bộ trạng thái từ Workspace Switcher của Admin Dashboard trước
    const savedAdminIndustry = localStorage.getItem("vclaw-admin-current-industry");
    let initialTab: "commerce" | "recruitment" | null = null;
    
    if (savedAdminIndustry === "RETAIL") {
      initialTab = "commerce";
    } else if (savedAdminIndustry === "HEAD_HUNTER") {
      initialTab = "recruitment";
    }

    if (!initialTab) {
      const saved = localStorage.getItem("vclaw_workspace");
      if (saved === "commerce" || saved === "recruitment") {
        initialTab = saved;
      }
    }

    if (initialTab) {
      setActiveTab(initialTab);
      localStorage.setItem("vclaw_workspace", initialTab);
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
    // Đồng bộ đồng thời sang key trạng thái của Admin Dashboard
    localStorage.setItem("vclaw-admin-current-industry", tab === "commerce" ? "RETAIL" : "HEAD_HUNTER");
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

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <DownloadButtonGroup
                primaryCtaText={workspace.hero.primaryCta}
                activeOS={downloadOS}
                onOSChange={handleOSChange}
                locale={locale}
                theme="hero"
              />
              {workspace.hero.secondaryCta ? (
                <Button
                  href={docsHref}
                  size="lg"
                  variant="outline"
                  className="cursor-pointer border-[color:var(--hero-card-border)] bg-[color:var(--hero-card)]/60 text-[color:var(--hero-foreground)] backdrop-blur hover:bg-[color:var(--hero-card)] rounded-full h-12 px-6"
                >
                  <BookOpenText className="h-4 w-4" />
                  {workspace.hero.secondaryCta}
                </Button>
              ) : null}
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
                  <DownloadButtonGroup
                    size="lg"
                    primaryCtaText={workspace.download.primaryCta}
                    activeOS={downloadOS}
                    onOSChange={handleOSChange}
                    locale={locale}
                    theme="download-section"
                  />
                  {workspace.download.secondaryCta ? (
                    <Button
                      href={docsHref}
                      size="lg"
                      variant="outline"
                      className="h-14 cursor-pointer border-[color:var(--hero-card-border)] px-8 text-base text-[color:var(--hero-foreground)] rounded-full"
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
                    <LinuxIcon className="h-4 w-4" />
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
                    <LinuxIcon className="h-3.5 w-3.5" />
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
              <DownloadButtonGroup
                primaryCtaText={workspace.finalCta.primaryCta}
                activeOS={downloadOS}
                onOSChange={handleOSChange}
                locale={locale}
                theme="final-cta"
              />
              {workspace.finalCta.secondaryCta ? (
                <Button
                  href={docsHref}
                  size="lg"
                  variant="outline"
                  className="cursor-pointer border-[color:var(--cta-border)] text-[color:var(--cta-foreground)] rounded-full h-12 px-6"
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
