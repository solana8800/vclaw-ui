"use client";

import { useState } from "react";
import { BookOpenText, LayoutDashboard, Menu, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type MobileMenuProps = {
  labels: {
    docs: string;
    admin: string;
  };
};

export function MobileMenu({ labels }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--line-strong)] bg-[color:var(--surface-glass)] text-[color:var(--foreground-strong)] shadow-[0_12px_30px_-24px_var(--shadow-color)] backdrop-blur transition hover:border-[color:var(--brand)]"
        aria-label="Open Menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile Drawer Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-50 flex flex-col bg-[color:var(--background)] p-6 transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-2xl font-bold text-[color:var(--brand-yellow)]"
              style={{ backgroundImage: "var(--brand-gradient)" }}
            >
              V
            </div>
            <span className="text-lg font-bold">VClaw</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--line)] text-[color:var(--foreground)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-col gap-4">
          <Link
            href="/docs"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] px-4 py-4 text-base font-medium text-[color:var(--foreground-strong)] shadow-sm"
          >
            <BookOpenText className="h-5 w-5 text-[color:var(--brand)]" />
            {labels.docs}
          </Link>
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
