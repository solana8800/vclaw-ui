import * as React from "react";

import { cn } from "@/lib/utils";

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-[color:var(--line-strong)] bg-[color:var(--brand-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--brand-strong)]",
        className,
      )}
      {...props}
    />
  );
}
