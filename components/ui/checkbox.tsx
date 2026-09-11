"use client";

import type { InputHTMLAttributes, Ref } from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  ref?: Ref<HTMLInputElement>;
}

export function Checkbox({ className, ref, ...props }: CheckboxProps) {
  return (
    <input
      type="checkbox"
      ref={ref}
      className={cn(
        "h-4 w-4 shrink-0 rounded-xs border-line accent-deep-indigo",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trust-teal",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}