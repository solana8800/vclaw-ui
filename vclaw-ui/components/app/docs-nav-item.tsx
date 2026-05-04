"use client";

import { useIsDesktop } from "@/lib/hooks/use-is-desktop";
import { BookOpenText } from "lucide-react";
import { Link } from "@/i18n/navigation";

type DocsNavItemProps = {
  href: string;
  label: string;
};

/**
 * Component render nút "Tài liệu" trên Header.
 * Tự động ẩn nếu phát hiện đang chạy trong môi trường Desktop (Electron).
 */
export function DocsNavItem({ href, label }: DocsNavItemProps) {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return null;
  }

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line-strong)] bg-[color:var(--surface-glass)] px-4 py-2 text-sm font-medium text-[color:var(--foreground)] transition hover:border-[color:var(--brand)] hover:bg-[color:var(--brand-softer)] hover:text-[color:var(--foreground-strong)]"
    >
      <BookOpenText className="h-4 w-4" />
      {label}
    </Link>
  );
}
