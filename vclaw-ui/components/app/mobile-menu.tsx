"use client";

import { useEffect, useState } from "react";
import { BookOpenText, LayoutDashboard, Menu, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/shared";

type MobileMenuProps = {
  labels: {
    docs: string;
    admin: string;
    openMenu: string;
    closeMenu: string;
  };
};

export function MobileMenu({ labels }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const isElectron = 
      typeof window !== "undefined" && 
      navigator.userAgent.toLowerCase().includes("electron");
    const isForcedDesktop = process.env.NEXT_PUBLIC_IS_DESKTOP === "true";
    setIsDesktop(isElectron || isForcedDesktop);
  }, []);

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--line-strong)] bg-[color:var(--surface-glass)] text-[color:var(--foreground-strong)] shadow-[0_12px_30px_-24px_var(--shadow-color)] backdrop-blur transition hover:border-[color:var(--brand)]"
        aria-label={isOpen ? labels.closeMenu : labels.openMenu}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile Drawer Overlay */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 top-[73px] z-30 flex flex-col bg-[color:var(--background)]/80 p-6 backdrop-blur-xl transition-all duration-300 ease-in-out",
          isOpen ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0 pointer-events-none"
        )}
      >
        <nav className="flex flex-col gap-4">
          {!isDesktop && (
            <Link
              href="/docs"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] px-4 py-4 text-base font-medium text-[color:var(--foreground-strong)] shadow-sm"
            >
              <BookOpenText className="h-5 w-5 text-[color:var(--brand)]" />
              {labels.docs}
            </Link>
          )}
          <Link
            href="/admin"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 rounded-2xl px-4 py-4 text-base font-semibold text-brand-contrast shadow-[0_12px_30px_-12px_var(--brand-glow)]"
            style={{
              backgroundImage: "var(--brand-gradient)",
              color: "var(--brand-contrast)",
            }}
          >
            <LayoutDashboard className="h-5 w-5" />
            {labels.admin}
          </Link>
        </nav>
      </div>
    </div>
  );
}
