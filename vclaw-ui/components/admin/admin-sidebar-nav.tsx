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
} from "lucide-react";
import { startTransition, useEffect, useState } from "react";

import { cn } from "@/lib/shared";
import type { AdminNavigationItem } from "@/components/admin/admin-shell";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const STORAGE_KEY = "vclaw-admin-sidebar-collapsed";

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
};

export function AdminSidebarNav({
  navigation,
  currentPath,
  sidebarTitle,
  guideHref: guideHrefProp,
  guideLabel,
}: {
  navigation: AdminNavigationItem[];
  currentPath: string;
  sidebarTitle: string;
  guideHref?: string;
  guideLabel?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Tự tính guide URL từ currentPath nếu không được truyền vào
  const guideHref = guideHrefProp ?? currentPath.replace(/\/admin.*$/, "/admin/guide");

  useEffect(() => {
    startTransition(() => {
      const stored = localStorage.getItem(STORAGE_KEY);
      setMounted(true);
      if (stored === "true") setCollapsed(true);
    });
  }, []);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  };

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
          <div className="rounded-2xl bg-[color:var(--brand-soft)] p-2.5 text-[color:var(--brand-strong)] ring-1 ring-[color:var(--brand-soft)]/80 shrink-0">
            <Zap className="h-5 w-5" aria-hidden />
          </div>
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

      {collapsed && (
        <button
          onClick={toggle}
          className="mx-auto mb-4 flex rounded-xl p-1.5 text-[color:var(--muted)] hover:bg-[color:var(--brand-softer)] hover:text-[color:var(--foreground-strong)] transition-colors"
          aria-label="Mở rộng menu"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      <nav className="space-y-1" aria-label={sidebarTitle}>
        <TooltipProvider delayDuration={300}>
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
        <div className="mt-4 pt-2 border-t border-[color:var(--line)]/50">
          <TooltipProvider delayDuration={300}>
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={guideHref}
                    className="flex justify-center rounded-xl p-2 text-[color:var(--muted)]/60 transition-colors hover:bg-[color:var(--brand-softer)] hover:text-[color:var(--foreground-strong)]"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={12}>
                  {guideLabel ?? "Hướng dẫn"}
                </TooltipContent>
              </Tooltip>
            ) : (
              <Link
                href={guideHref}
                className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-[11px] font-medium text-[color:var(--muted)]/60 transition-colors hover:text-[color:var(--foreground-strong)]"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                <span>{guideLabel ?? "Hướng dẫn"}</span>
              </Link>
            )}
          </TooltipProvider>
        </div>
      )}
    </aside>
  );
}
