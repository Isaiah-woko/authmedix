import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Tone = meaning, fixed by the design system:
 *   teal → active/allowed · indigo → referral/brand · coral → denied/emergency/flagged
 *   amber → expiring/pending · slate → neutral
 * `pulse` is reserved for critical expiry (<5 min) — motion that confirms state.
 */
export type BadgeTone = "teal" | "indigo" | "coral" | "amber" | "slate";

const TONES: Record<BadgeTone, string> = {
  teal: "border-trust-teal/30 bg-trust-teal-soft text-trust-teal",
  indigo: "border-deep-indigo/30 bg-deep-indigo-soft text-deep-indigo",
  coral: "border-alert-coral/30 bg-alert-coral-soft text-alert-coral",
  amber: "border-amber-watch/30 bg-amber-watch-soft text-amber-watch",
  slate: "border-line bg-paper-dim text-slate-ink",
};

export function Badge({
  tone = "slate",
  pulse = false,
  className,
  children,
}: {
  tone?: BadgeTone;
  pulse?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-data font-medium",
        TONES[tone],
        pulse && "animate-pulse-soft",
        className
      )}
    >
      {children}
    </span>
  );
}