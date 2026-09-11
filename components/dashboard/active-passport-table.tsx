"use client";

import Link from "next/link";
import { PassportTypeBadge } from "@/components/patients/passport-type-badge";
import { useCountdown } from "@/hooks/use-countdown";
import { formatCountdownCompact } from "@/lib/dates";
import { ROUTES } from "@/lib/routes";
import type { ActivePassportRow } from "@/lib/api/passports";

function Row({ passport }: { passport: ActivePassportRow }) {
  const remaining = useCountdown(passport.expiresAt);
  const expired = remaining?.isExpired === true;
  const soon = !expired && (remaining?.totalSeconds ?? 0) <= 30 * 60;

  const tone = expired
    ? "text-alert-coral"
    : passport.type === "BREAK_GLASS"
      ? "text-alert-coral"
      : passport.type === "REFERRAL"
        ? "text-deep-indigo"
        : soon
          ? "text-amber-watch"
          : "text-trust-teal";

  const href = `${ROUTES.patientRecord(passport.patientId)}?name=${encodeURIComponent(
    passport.patientName
  )}&code=${encodeURIComponent(passport.patientCode)}`;

  return (
    <tr className="border-b border-section-line transition-colors last:border-0 hover:bg-paper">
      <td className="px-4 py-3">
        <Link href={href} className="identifier text-dense text-ink hover:text-deep-indigo">
          {passport.patientCode}
        </Link>
      </td>
      <td className="px-4 py-3 text-body text-ink">{passport.patientName}</td>
      <td className="px-4 py-3">
        <PassportTypeBadge type={passport.type} />
      </td>
      <td className={`identifier px-4 py-3 text-dense ${tone}`}>
        {formatCountdownCompact(passport.expiresAt)}
      </td>
    </tr>
  );
}

export function ActivePassportTable({ passports }: { passports: ActivePassportRow[] }) {
  return (
    <section className="overflow-hidden rounded border border-section-line bg-white">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-section-line">
            <th className="px-4 py-3 text-body font-medium text-slate">Patient code</th>
            <th className="px-4 py-3 text-body font-medium text-slate">Name</th>
            <th className="px-4 py-3 text-body font-medium text-slate">Passport type</th>
            <th className="px-4 py-3 text-body font-medium text-slate">Time remaining</th>
          </tr>
        </thead>
        <tbody>
          {passports.map((passport) => (
            <Row key={passport.id} passport={passport} />
          ))}
        </tbody>
      </table>
    </section>
  );
}