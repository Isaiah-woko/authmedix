"use client";

import type { Ref, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
  ref?: Ref<HTMLTextAreaElement>;
}

export function Textarea({ invalid = false, className, ref, ...props }: TextareaProps) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-24 w-full rounded-sm border bg-white px-3 py-2 text-body text-ink",
        "placeholder:text-slate-ink-soft",
        "focus:outline-none",
        invalid
          ? "border-alert-coral focus:border-alert-coral"
          : "border-line focus:border-trust-teal",
        "disabled:cursor-not-allowed disabled:bg-paper-dim disabled:text-slate-ink",
        className
      )}
      {...props}
    />
  );
}