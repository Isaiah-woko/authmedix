import { formatPassportType } from "@/lib/format";
import type { PassportType } from "@/types/passport";

const tones: Record<PassportType, string> = {
  STANDARD: "border-trust-teal/40 bg-trust-teal/10 text-trust-teal",
  REFERRAL: "border-amber-watch/40 bg-amber-watch/10 text-amber-watch",
  BREAK_GLASS: "border-alert-coral/40 bg-alert-coral/10 text-alert-coral",
};

/** One meaning per color: teal active/normal, amber time-limited, coral emergency. */
export function PassportTypeBadge({ type }: { type: PassportType }) {
  return (
    <span className={`inline-block rounded border px-2 py-0.5 text-dense font-medium ${tones[type]}`}>
      {formatPassportType(type)}
    </span>
  );
}