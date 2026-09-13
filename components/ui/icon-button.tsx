"use client";

import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "outline" | "ghost" | "danger";
  /** Required — icon-only buttons must always carry an accessible name. */
  label: string;
}

const VARIANTS = {
  outline: "border border-line bg-white text-slate-ink hover:bg-paper-dim hover:text-ink",
  ghost: "text-slate-ink hover:bg-paper-dim hover:text-ink",
  danger: "border border-alert-coral/40 bg-white text-alert-coral hover:bg-alert-coral-soft",
} as const;

export function IconButton({ variant = "outline", label, className, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-sm",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trust-teal",
        "disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant],
        className
      )}
      {...props}
    />
  );
}