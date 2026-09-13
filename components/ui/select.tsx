"use client";

import type { Ref, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
  ref?: Ref<HTMLSelectElement>;
}

export function Select({ invalid = false, className, ref, children, ...props }: SelectProps) {
  return (
    <select
      ref={ref}
      className={cn(
        "h-9 w-full rounded-sm border bg-white px-3 text-body text-ink",
        "focus:outline-none",
        invalid
          ? "border-alert-coral focus:border-alert-coral"
          : "border-line focus:border-trust-teal",
        "disabled:cursor-not-allowed disabled:bg-paper-dim disabled:text-slate-ink",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}