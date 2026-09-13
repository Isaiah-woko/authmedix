"use client";

import type { InputHTMLAttributes, Ref } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** IBM Plex Mono — ONLY for scannable identifiers: Health IDs, patient codes. */
  mono?: boolean;
  invalid?: boolean;
  ref?: Ref<HTMLInputElement>;
}

export function Input({ mono = false, invalid = false, className, ref, ...props }: InputProps) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-9 w-full rounded-sm border bg-white px-3 text-body text-ink",
        "placeholder:text-slate-ink-soft",
        "focus:outline-none",
        invalid
          ? "border-alert-coral focus:border-alert-coral"
          : "border-line focus:border-trust-teal",
        mono && "mono",
        "disabled:cursor-not-allowed disabled:bg-paper-dim disabled:text-slate-ink",
        className
      )}
      {...props}
    />
  );
}