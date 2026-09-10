import { formatPassportType } from "@/lib/format";
import type { PassportType } from "@/types/passport";

/** Handoff section 4: teal standard, indigo referral, coral break-glass. One meaning each. */
const tones: Record<PassportType, string> = {
  STANDARD: "border-trust-teal/40 bg-trust-teal/10 text-trust-teal",
  REFERRAL: "border-deep-indigo/40 bg-deep-indigo/10 text-deep-indigo",
  BREAK_GLASS: "border-alert-coral/40 bg-alert-coral/10 text-alert-coral",
};

export function PassportTypeBadge({ type }: { type: PassportType }) {
  return (
    <span className={`inline-block rounded border px-2 py-0.5 text-dense font-medium ${tones[type]}`}>
      {formatPassportType(type)}
    </span>
  );
}