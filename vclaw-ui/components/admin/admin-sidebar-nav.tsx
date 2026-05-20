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
  SlidersHorizontal,
  X,
} from "lucide-react";
import { startTransition, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useParams } from "next/navigation";

import { detectAdminIndustryFromPath } from "@/lib/admin/detect-industry";
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
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const locale = params.locale as string;
  const pathForIndustry = pathname || currentPath;

  // Tự tính guide URL từ currentPath nếu không được truyền vào
  const guideHref = guideHrefProp ?? currentPath.replace(/\/admin.*$/, "/admin/guide");

  const INDUSTRY_STORAGE_KEY = "vclaw-admin-current-industry";

  const industryFromPath = useMemo(
    () => detectAdminIndustryFromPath(pathForIndustry),
    [pathForIndustry],
  );

  const [currentIndustry, setCurrentIndustry] = useState<string>(industryFromPath);

  useEffect(() => {
    startTransition(() => {
      const storedCollapse = localStorage.getItem(STORAGE_KEY);
      const storedIndustry = localStorage.getItem(INDUSTRY_STORAGE_KEY);

      setMounted(true);
      if (storedCollapse === "true") setCollapsed(true);

      const detectedIndustry = industryFromPath;
      setCurrentIndustry(detectedIndustry);
      if (detectedIndustry !== storedIndustry) {
        localStorage.setItem(INDUSTRY_STORAGE_KEY, detectedIndustry);
      }

      if (
        detectedIndustry === "HEAD_HUNTER" &&
        (pathForIndustry.endsWith("/admin") || pathForIndustry.endsWith("/admin/"))
      ) {
        router.push(getAdminPath(locale as any, "/admin/recruitment"));
      }
    });
  }, [industryFromPath, pathForIndustry, locale, router]);

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
      if (ws.industry === "HEAD_HUNTER" && !pathForIndustry.includes("/admin/recruitment")) {
        router.push(getAdminPath(locale as any, "/admin/recruitment"));
      } else if (ws.industry === "RETAIL" && pathForIndustry.includes("/admin/recruitment")) {
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
        "h-fit rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-glass)] shadow-[0_32px_70px_-54px_var(--shadow-color)] backdrop-blur transition-all duration-300 sm:rounded-3xl w-full lg:w-auto",
        collapsed ? "lg:p-2.5" : "lg:p-3.5 sm:lg:p-4",
        isMobileOpen ? "p-3.5 sm:p-4" : "p-2.5 lg:p-4",
        !mounted && "p-3.5 sm:p-4",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-3",
          collapsed ? "lg:mb-3 lg:justify-center" : "lg:mb-4 lg:gap-3",
          isMobileOpen ? "mb-4" : "mb-0 lg:mb-4",
          !mounted && "mb-4 gap-3",
        )}
      >
        {/* Bản Desktop Thu gọn: chỉ hiển thị nút Zap */}
        {collapsed && mounted ? (
          <button
            onClick={toggle}
            className="hidden lg:flex rounded-2xl bg-[color:var(--brand-soft)] p-2.5 text-[color:var(--brand-strong)] ring-1 ring-[color:var(--brand-soft)]/80 shrink-0 hover:bg-[color:var(--brand-softer)] transition-colors cursor-pointer"
            aria-label="Mở rộng menu"
          >
            <Zap className="h-5 w-5" aria-hidden />
          </button>
        ) : (
          /* Bản Desktop mở rộng & Bản Mobile: hiển thị Title */
          <div className={cn("min-w-0 flex-1 pl-1", collapsed && mounted && "lg:hidden")}>
            <div className="font-bold tracking-tight text-[color:var(--foreground-strong)] truncate">
              {sidebarTitle}
            </div>
          </div>
        )}
        
        {/* Nút Toggle trên Desktop (khi không collapsed) */}
        {!collapsed && mounted && (
          <button
            onClick={toggle}
            className="hidden lg:block rounded-xl p-1.5 text-[color:var(--muted)] hover:bg-[color:var(--brand-softer)] hover:text-[color:var(--foreground-strong)] transition-colors shrink-0 cursor-pointer"
            aria-label="Thu gọn menu"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        {/* Nút Toggle Hamburger trên Mobile */}
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="flex lg:hidden items-center justify-center rounded-xl p-1.5 text-[color:var(--muted)] hover:bg-[color:var(--brand-softer)] hover:text-[color:var(--foreground-strong)] transition-colors cursor-pointer shrink-0"
          aria-label={isMobileOpen ? "Đóng menu" : "Mở menu"}
        >
          {isMobileOpen ? <X className="h-5 w-5" /> : <SlidersHorizontal className="h-5 w-5" />}
        </button>
      </div>

      {/* Menu items & Workspace Switcher container (Ẩn trên mobile khi đóng, hiển thị trên desktop hoặc khi mở mobile) */}
      <div className={cn("lg:block space-y-4", isMobileOpen ? "block" : "hidden")}>
        <WorkspaceSwitcher 
          initialWorkspaces={[
            { id: "1", name: workspaceLabels?.retail || "Bán lẻ", industry: "RETAIL" },
            { id: "2", name: workspaceLabels?.headhunter || "Tuyển dụng", industry: "HEAD_HUNTER" }
          ]} 
          collapsed={collapsed}
          activeIndustry={currentIndustry}
          onWorkspaceChange={(ws) => {
            handleWorkspaceChange(ws);
            setIsMobileOpen(false); // Tự động đóng menu khi chuyển workspace trên mobile
          }}
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

              const active = item.href ? pathForIndustry === item.href : false;
              const Icon = item.icon
                ? ICON_MAP[item.icon as keyof typeof ICON_MAP] || null
                : null;

              const menuLink = (
                <Link
                  key={item.href || index}
                  href={item.href || "#"}
                  onClick={() => setIsMobileOpen(false)} // Tự động đóng menu khi click link trên mobile
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
                    onClick={() => setIsMobileOpen(false)} // Tự động đóng menu trên mobile khi xem hướng dẫn
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
      </div>
    </aside>
  );
}
