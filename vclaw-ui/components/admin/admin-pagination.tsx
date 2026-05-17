"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/shared";

interface AdminPaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
  className?: string;
  /** Nhãn trang, mặc định tiếng Việt */
  pageLabel?: string;
}

/** Ghép URL tương đối + query `page` — không dùng `window` (SSR-safe). */
function createPageUrl(baseUrl: string, page: number): string {
  const hashIdx = baseUrl.indexOf("#");
  const hash = hashIdx >= 0 ? baseUrl.slice(hashIdx) : "";
  const pathAndQuery = hashIdx >= 0 ? baseUrl.slice(0, hashIdx) : baseUrl;
  const queryIdx = pathAndQuery.indexOf("?");
  const pathname = queryIdx >= 0 ? pathAndQuery.slice(0, queryIdx) : pathAndQuery;
  const params = new URLSearchParams(queryIdx >= 0 ? pathAndQuery.slice(queryIdx + 1) : "");
  params.set("page", String(page));
  const qs = params.toString();
  return `${pathname}${qs ? `?${qs}` : ""}${hash}`;
}

export function AdminPagination({
  currentPage,
  totalPages,
  baseUrl,
  className,
  pageLabel = "Trang",
}: AdminPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className={cn("flex items-center justify-between px-2 py-4", className)}>
      <div className="text-sm text-[color:var(--muted)]">
        {pageLabel}{" "}
        <span className="font-medium text-[color:var(--foreground-strong)]">{currentPage}</span> / {totalPages}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          href={currentPage > 1 ? createPageUrl(baseUrl, currentPage - 1) : undefined}
          className="h-9 w-9 p-0 border-[color:var(--line)] bg-[color:var(--surface-glass)]"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum = currentPage;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else {
              if (currentPage <= 3) pageNum = i + 1;
              else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = currentPage - 2 + i;
            }

            return (
              <Button
                key={pageNum}
                variant={currentPage === pageNum ? "primary" : "outline"}
                size="sm"
                href={createPageUrl(baseUrl, pageNum)}
                className={cn(
                  "h-9 w-9 p-0 rounded-lg",
                  currentPage !== pageNum && "border-[color:var(--line)] bg-[color:var(--surface-glass)] text-[color:var(--foreground-strong)]"
                )}
              >
                {pageNum}
              </Button>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          href={currentPage < totalPages ? createPageUrl(baseUrl, currentPage + 1) : undefined}
          className="h-9 w-9 p-0 border-[color:var(--line)] bg-[color:var(--surface-glass)]"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
