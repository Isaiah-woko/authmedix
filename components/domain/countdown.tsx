"use client";

/**
 * Live countdown display — H:MM:SS ticking every second.
 * Teal → Amber (<15 min) → Coral (<5 min) → pulse (<1 min).
 * Driven by useCountdown, which sources from server timestamps.
 */

import { useCountdown } from "@/hooks/use-countdown";
import { cn } from "@/lib/utils";

export function Countdown({
  target,
  onExpire,
  className,
  prefix,
}: {
  target: string | Date;
  onExpire?: () => void;
  className?: string;
  /** Optional prefix: "Expires in" */
  prefix?: string;
}) {
  const { label, expired, expiringSoon, critical } = useCountdown(target, onExpire);

  const colorClass = expired
    ? "text-alert-coral"
    : critical
      ? "text-alert-coral"
      : expiringSoon
        ? "text-amber-watch"
        : "text-trust-teal";

  return (
    <span
      className={cn(
        "mono inline-flex items-center gap-1.5 text-data",
        colorClass,
        critical && !expired && "animate-pulse-soft",
        className
      )}
    >
      {prefix ? <span className="font-sans text-slate-ink">{prefix}</span> : null}
      {expired ? "Expired" : label}
    </span>
  );
}