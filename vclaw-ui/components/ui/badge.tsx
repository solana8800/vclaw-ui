import * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = {
  default:
    "inline-flex items-center rounded-full border border-[color:var(--line-strong)] bg-[color:var(--brand-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--brand-strong)]",
  outline:
    "inline-flex items-center rounded-full border border-[color:var(--line)] bg-transparent px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--foreground)]",
} as const;

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: keyof typeof badgeVariants;
};

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants[variant], className)}
      {...props}
    />
  );
}
