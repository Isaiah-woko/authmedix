"use client";

import { useCountdown } from "@/hooks/use-countdown";
import { formatCountdownHMS } from "@/lib/dates";

/** Coral banner for an active break-glass window. Always visible, never behind a click. */
export function BreakGlassBanner({ expiresAt }: { expiresAt: string }) {
  const remaining = useCountdown(expiresAt);

  return (
    <div className="mb-6 flex items-center justify-between gap-4 rounded border border-alert-coral/40 bg-alert-coral/10 px-4 py-3">
      <p className="text-body font-medium text-alert-coral">
        Emergency access active. You are seeing the fixed Emergency Summary, not your normal role view.
      </p>
      <p className="identifier shrink-0 text-body-lg font-semibold text-alert-coral">
        {remaining?.isExpired ? "Expired" : formatCountdownHMS(expiresAt)}
      </p>
    </div>
  );
}