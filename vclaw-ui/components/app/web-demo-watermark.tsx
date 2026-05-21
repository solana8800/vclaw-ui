"use client";

import { useLocale } from "next-intl";
import { AlertCircle, DownloadCloud, X } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { getLocaleHref } from "@/i18n/routing";
import { cn } from "@/lib/shared/utils";
import type { AppLocale } from "@/i18n/routing";

export function WebDemoWatermark() {
  const [isVisible, setIsVisible] = useState(true);
  const locale = useLocale() as AppLocale;
  const isVi = locale === "vi";

  // If this is the desktop build, we don't show the watermark.
  if (process.env.NEXT_PUBLIC_IS_DESKTOP === "true") {
    return null;
  }

  if (!isVisible) {
    return null;
  }

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 p-2 sm:p-3 text-sm text-amber-900 dark:text-amber-200 relative flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 z-30 w-full animate-in fade-in duration-500">
      <div className="flex items-center gap-2 text-center sm:text-left">
        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <p className="font-medium">
          <strong className="font-semibold">{isVi ? "Bản Xem Trước: " : "Preview: "}</strong>
          {isVi 
            ? "Các tính năng AI cục bộ sẽ không hoạt động. Hãy tải bản Desktop." 
            : "Local AI features are disabled. Please download the Desktop app."}
        </p>
      </div>
      <Link 
        href={getLocaleHref(locale, "/?landing=true")} 
        className={cn(
          "inline-flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 transition-colors whitespace-nowrap",
          "bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1 rounded-md border border-amber-500/20 text-xs sm:text-sm"
        )}
      >
        <DownloadCloud className="w-3.5 h-3.5" />
        {isVi ? "Tải VClaw" : "Download VClaw"}
      </Link>
      <button
        onClick={() => setIsVisible(false)}
        className="absolute right-2 p-1.5 rounded-md hover:bg-amber-500/20 transition-colors text-amber-700 dark:text-amber-400 hidden sm:block"
        aria-label="Close"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
