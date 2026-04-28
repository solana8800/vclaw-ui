import Link from "next/link";
import * as React from "react";

import { cn } from "@/lib/shared";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-transparent bg-[image:var(--brand-gradient)] text-brand-contrast shadow-[0_24px_60px_-32px_var(--brand-glow)] hover:brightness-105",
  secondary:
    "border border-[color:var(--line)] bg-[color:var(--surface-strong)] text-[color:var(--foreground-strong)] shadow-[0_24px_50px_-36px_var(--shadow-color)] hover:bg-[color:var(--surface-soft)]",
  ghost:
    "bg-transparent text-[color:var(--foreground)] hover:bg-[color:var(--brand-softer)] hover:text-[color:var(--foreground-strong)]",
  outline:
    "border border-[color:var(--line-strong)] bg-[color:var(--surface-glass)] text-[color:var(--foreground-strong)] hover:border-[color:var(--brand)] hover:bg-[color:var(--brand-softer)] hover:text-[color:var(--brand-strong)]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-6 text-base",
  icon: "h-10 w-10 p-0",
};

type SharedProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: React.ReactNode;
  href?: string;
};

type ButtonProps = SharedProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> &
  Pick<React.AnchorHTMLAttributes<HTMLAnchorElement>, "target" | "rel">;

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  const classes = cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)] disabled:pointer-events-none disabled:opacity-50",
    variantClasses[variant],
    sizeClasses[size],
    className,
  );

  if (props.href) {
    const { href, target, rel } = props;
    return (
      <Link
        href={href}
        className={classes}
        target={target}
        rel={rel}
        style={variant === "primary" ? { color: "var(--brand-contrast)" } : undefined}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      className={classes}
      type={props.type ?? "button"}
      style={variant === "primary" ? { color: "var(--brand-contrast)" } : undefined}
      {...props}
    >
      {children}
    </button>
  );
}
