"use client";

import { useCountdown } from "@/hooks/use-countdown";
import { formatCountdownHMS } from "@/lib/dates";

/** Live HMS countdown for the session TTL, styled for the dark sidebar.
 *  The tints are the on-dark versions of teal, amber and coral. Same meanings. */
export function SessionCountdown({ expiresAt }: { expiresAt: string }) {
  const remaining = useCountdown(expiresAt);
  const expired = remaining?.isExpired === true;
  const soon = !expired && (remaining?.totalSeconds ?? 0) <= 30 * 60;

  return (
    <p className="text-dense text-white/60">
      Session ends in{" "}
      <span
        className={`identifier ${
          expired ? "text-[#F0876F]" : soon ? "text-[#E3B341]" : "text-[#6FC7C5]"
        }`}
      >
        {formatCountdownHMS(expiresAt)}
      </span>
    </p>
  );
}