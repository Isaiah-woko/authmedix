"use client";

import { Button } from "@/components/ui/button";
import { PassportTypeBadge } from "@/components/patients/passport-type-badge";
import { useCountdown } from "@/hooks/use-countdown";
import { formatCountdownCompact } from "@/lib/dates";
import { formatDuration } from "@/lib/format";
import type { AccessPassport } from "@/types/passport";

/** The trust panel: type, duration, live countdown, renew only where allowed. */
export function PassportPanel({
  passport,
  onRenew,
  renewing,
}: {
  passport: AccessPassport;
  onRenew: () => void;
  renewing: boolean;
}) {
  const remaining = useCountdown(passport.expiresAt);
  const soon = !remaining?.isExpired && (remaining?.totalSeconds ?? 0) <= 30 * 60;
  const renewable = passport.type !== "BREAK_GLASS";

  return (
    <section className="rounded border border-section-line bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-body font-medium text-ink">Access passport</p>
        <PassportTypeBadge type={passport.type} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <dt className="text-dense text-slate">Duration</dt>
          <dd className="text-body text-ink">{formatDuration(passport.duration)}</dd>
        </div>
        <div>
          <dt className="text-dense text-slate">Time remaining</dt>
          <dd className={`identifier text-body ${soon ? "text-amber-watch" : "text-trust-teal"}`}>
            {formatCountdownCompact(passport.expiresAt)}
          </dd>
        </div>
        {passport.renewalCount > 0 ? (
          <div>
            <dt className="text-dense text-slate">Renewals</dt>
            <dd className="text-body text-ink">{passport.renewalCount}</dd>
          </div>
        ) : null}
      </dl>
      {renewable ? (
        <Button variant="secondary" className="mt-4" onClick={onRenew} loading={renewing}>
          Renew
        </Button>
      ) : (
        <p className="mt-3 text-dense text-slate">
          Break-glass access cannot be renewed. It must be deliberately re-invoked if the emergency continues.
        </p>
      )}
    </section>
  );
}