"use client";

import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Variants map 1:1 to meaning (never decorative):
 *   primary → Deep Indigo (brand/primary action)
 *   trust   → Trust Teal (allow/grant/renew)
 *   danger  → Alert Coral (revoke/deny/break-glass)
 *   amber   → Amber Watch (pending/watch-state actions)
 *   outline → neutral secondary · ghost → tertiary
 * No hover motion — color changes are instant (brief: motion only confirms actions).
 */
type Variant = "primary" | "trust" | "danger" | "amber" | "outline" | "ghost";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-deep-indigo text-white hover:bg-deep-indigo-dark",
  trust: "bg-trust-teal text-white hover:bg-trust-teal-dark",
  danger: "bg-alert-coral text-white hover:bg-alert-coral-dark",
  amber: "bg-amber-watch text-white hover:bg-amber-watch-dark",
  outline: "border border-line bg-white text-ink hover:bg-paper-dim",
  ghost: "text-slate-ink hover:bg-paper-dim hover:text-ink",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-data",
  md: "h-9 px-4 text-body",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Shows a spinner and blocks re-submission — confirms the action is in flight. */
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-sm font-medium",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trust-teal",
        "disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent",
        className
      )}
    />
  );
}