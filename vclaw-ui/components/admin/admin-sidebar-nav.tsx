"use client";

import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  BookOpen,
  Inbox,
  ShoppingBag,
  Calendar,
  CreditCard,
  Package,
  Users,
  Truck,
  BarChart3,
  Zap,
  Settings,
  MessageCircle,
  HelpCircle,
  Briefcase,
  Search,
} from "lucide-react";
import { startTransition, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

import { cn } from "@/lib/shared";
import { getAdminPath } from "@/lib/admin/content";
import type { AdminNavigationItem } from "@/components/admin/admin-shell";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { WorkspaceSwitcher } from "@/components/admin/workspace-switcher";

const STORAGE_KEY = "vclaw-admin-sidebar-collapsed";

const LinkedInIcon = (props: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const ICON_MAP = {
  LayoutDashboard,
  BookOpen,
  Inbox,
  ShoppingBag,
  Calendar,
  CreditCard,
  Package,
  Users,
  Truck,
  BarChart3,
  Zap,
  Settings,
  MessageCircle,
  Briefcase,
  Search,
  Linkedin: LinkedInIcon,
};

export function AdminSidebarNav({
  navigation,
  currentPath,
  sidebarTitle,
  guideHref: guideHrefProp,
  guideLabel,
  workspaceLabels,
}: {
  navigation: AdminNavigationItem[];
  currentPath: string;
  sidebarTitle: string;
  guideHref?: string;
  guideLabel?: string;
  workspaceLabels?: { retail: string; headhunter: string };
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  // Tự tính guide URL từ currentPath nếu không được truyền vào
  const guideHref = guideHrefProp ?? currentPath.replace(/\/admin.*$/, "/admin/guide");

  const INDUSTRY_STORAGE_KEY = "vclaw-admin-current-industry";
  
  const [currentIndustry, setCurrentIndustry] = useState<string>("RETAIL");

  useEffect(() => {
    startTransition(() => {
      const storedCollapse = localStorage.getItem(STORAGE_KEY);
      const storedIndustry = localStorage.getItem(INDUSTRY_STORAGE_KEY);
      
      setMounted(true);
      if (storedCollapse === "true") setCollapsed(true);
      
      // Khởi tạo industry: ưu tiên từ đường dẫn, sau đó đến giá trị đã lưu
      let detectedIndustry = storedIndustry || "RETAIL";
      
      const isRecruitmentPath = currentPath.includes("/admin/recruitment");
      const isRetailPath = 
        currentPath.includes("/admin/customers") || 
        currentPath.includes("/admin/orders") || 
        currentPath.includes("/admin/products") || 
        currentPath.includes("/admin/bookings") || 
        currentPath.includes("/admin/settings") ||
        currentPath.endsWith("/admin") || 
        currentPath.endsWith("/admin/");

      if (isRecruitmentPath) {
        detectedIndustry = "HEAD_HUNTER";
      } else if (isRetailPath) {
        detectedIndustry = "RETAIL";
      }
      
      setCurrentIndustry(detectedIndustry);
      if (detectedIndustry !== storedIndustry) {
        localStorage.setItem(INDUSTRY_STORAGE_KEY, detectedIndustry);
      }

      // Nếu đang ở trang overview mặc định nhưng industry là HEAD_HUNTER, tự động chuyển hướng
      if (detectedIndustry === "HEAD_HUNTER" && (currentPath.endsWith("/admin") || currentPath.endsWith("/admin/"))) {
        router.push(getAdminPath(locale as any, "/admin/recruitment"));
      }
    });
  }, [currentPath, locale, router]);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  };

  const handleWorkspaceChange = (ws: { industry: string | null }) => {
    if (ws.industry) {
      setCurrentIndustry(ws.industry);
      localStorage.setItem(INDUSTRY_STORAGE_KEY, ws.industry);
      
      // Tự động chuyển hướng đến trang tương ứng nếu cần
      if (ws.industry === "HEAD_HUNTER" && !currentPath.includes("/admin/recruitment")) {
        router.push(getAdminPath(locale as any, "/admin/recruitment"));
      } else if (ws.industry === "RETAIL" && currentPath.includes("/admin/recruitment")) {
        router.push(getAdminPath(locale as any, "/admin"));
      }
    }
  };

  const filteredNavigation = navigation.filter(item => 
    !item.industry || item.industry === "COMMON" || item.industry === currentIndustry
  );

  return (
    <aside
      className={cn(
        "h-fit rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-glass)] shadow-[0_32px_70px_-54px_var(--shadow-color)] backdrop-blur transition-all duration-300 sm:rounded-3xl",
        collapsed ? "p-2.5" : "p-3.5 sm:p-4",
        !mounted && "p-3.5 sm:p-4",
      )}
    >
      <div
        className={cn(
          "flex items-center",
          collapsed ? "mb-3 justify-center" : "mb-4 gap-3",
          !mounted && "mb-4 gap-3",
        )}
      >
        {collapsed ? (
          <button
            onClick={toggle}
            className="rounded-2xl bg-[color:var(--brand-soft)] p-2.5 text-[color:var(--brand-strong)] ring-1 ring-[color:var(--brand-soft)]/80 shrink-0 hover:bg-[color:var(--brand-softer)] transition-colors cursor-pointer"
            aria-label="Mở rộng menu"
          >
            <Zap className="h-5 w-5" aria-hidden />
          </button>
        ) : (
          <div className="min-w-0 flex-1 pl-1">
            <div className="font-bold tracking-tight text-[color:var(--foreground-strong)] truncate">
              {sidebarTitle}
            </div>
          </div>
        )}
        
        {!collapsed && (
          <button
            onClick={toggle}
            className="rounded-xl p-1.5 text-[color:var(--muted)] hover:bg-[color:var(--brand-softer)] hover:text-[color:var(--foreground-strong)] transition-colors shrink-0"
            aria-label="Thu gọn menu"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      <WorkspaceSwitcher 
        initialWorkspaces={[
          { id: "1", name: workspaceLabels?.retail || "Bán lẻ", industry: "RETAIL" },
          { id: "2", name: workspaceLabels?.headhunter || "Tuyển dụng", industry: "HEAD_HUNTER" }
        ]} 
        collapsed={collapsed}
        activeIndustry={currentIndustry}
        onWorkspaceChange={handleWorkspaceChange}
      />

      <nav className="space-y-1" aria-label={sidebarTitle}>
        <TooltipProvider delayDuration={300}>
          {filteredNavigation.map((item, index) => {
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
              if (collapsed && mounted) return null;
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
            const Icon = item.icon
              ? ICON_MAP[item.icon as keyof typeof ICON_MAP] || null
              : null;

            const menuLink = (
              <Link
                key={item.href || index}
                href={item.href || "#"}
                className={cn(
                  "flex cursor-pointer items-center rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors duration-200",
                  collapsed && mounted ? "justify-center gap-0" : "gap-3",
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
                {(!collapsed || !mounted) && (
                  <span className="truncate">{item.label}</span>
                )}
              </Link>
            );

            if (collapsed && mounted) {
              return (
                <Tooltip key={item.href || index}>
                  <TooltipTrigger asChild>{menuLink}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={12}>
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return menuLink;
          })}
        </TooltipProvider>
      </nav>

      {guideHref && (
        <div className="mt-1 flex justify-center border-t border-[color:var(--line)]/20 pt-1">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href={guideHref}
                  className="rounded-lg p-1 text-[color:var(--muted)]/40 transition-colors hover:text-[color:var(--foreground-strong)]"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12}>
                {guideLabel ?? "Hướng dẫn"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </aside>
  );
}
