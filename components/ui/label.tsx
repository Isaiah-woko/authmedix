import type { LabelHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Sentence case everywhere — no ALL-CAPS labels (brief §5). */
export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-body font-medium text-ink", className)} {...props} />;
}

/** Inline validation / server error copy — Alert Coral, data size. */
export function FieldError({ children, className }: { children?: ReactNode; className?: string }) {
  if (!children) return null;
  return <p className={cn("mt-1 text-data text-alert-coral", className)}>{children}</p>;
}

/** Secondary guidance under a field — Slate, data size. */
export function FieldHint({ children, className }: { children?: ReactNode; className?: string }) {
  return <p className={cn("mt-1 text-data text-slate-ink", className)}>{children}</p>;
}