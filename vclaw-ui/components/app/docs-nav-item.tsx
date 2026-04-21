"use client";

import { useEffect, useState } from "react";
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
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    // Kiểm tra xem có đang chạy trong Electron hay không
    const isElectron = 
      typeof window !== "undefined" && 
      navigator.userAgent.toLowerCase().includes("electron");
    
    // Bạn cũng có thể dùng biến môi trường để check nếu muốn chính xác hơn lúc build
    const isForcedDesktop = process.env.NEXT_PUBLIC_IS_DESKTOP === "true";

    setIsDesktop(isElectron || isForcedDesktop);
  }, []);

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
