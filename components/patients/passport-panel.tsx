"use client";

import { Button } from "@/components/ui/button";
import { PassportTypeBadge } from "@/components/patients/passport-type-badge";
import { useCountdown } from "@/hooks/use-countdown";
import { formatCountdownHMS } from "@/lib/dates";
import type { PassportType } from "@/types/passport";

export function PassportPanel({
  type,
  expiresAt,
  renewalCount,
  canRenew,
  onRenew,
  renewing,
}: {
  type: PassportType;
  expiresAt: string;
  renewalCount: number;
  canRenew: boolean;
  onRenew: () => void;
  renewing: boolean;
}) {
  const remaining = useCountdown(expiresAt);
  const expired = remaining?.isExpired === true;
  const soon = !expired && (remaining?.totalSeconds ?? 0) <= 30 * 60;
  const tone = expired
    ? "text-alert-coral"
    : type === "BREAK_GLASS"
      ? "text-alert-coral"
      : soon
        ? "text-amber-watch"
        : "text-trust-teal";

  return (
    <aside className="h-fit rounded border border-section-line bg-white p-5">
      <p className="text-body font-medium text-ink">Access passport</p>
      <div className="mt-3">
        <PassportTypeBadge type={type} />
      </div>
      <p className={`identifier mt-3 text-body-lg ${tone}`}>{formatCountdownHMS(expiresAt)}</p>
      <p className="mt-1 text-dense text-slate">
        {expired ? "Expired" : "Time remaining on this access"} · Renewals: {renewalCount}
      </p>
      {canRenew ? (
        <Button className="mt-4" variant="secondary" onClick={onRenew} loading={renewing}>
          Renew
        </Button>
      ) : type === "BREAK_GLASS" ? (
        <p className="mt-3 text-dense text-slate">
          Break-glass access cannot be renewed. If the emergency continues, invoke it again or file a
          normal request.
        </p>
      ) : null}
    </aside>
  );
}