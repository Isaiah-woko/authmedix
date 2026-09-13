import type { PassportType } from "@/types";
import { Badge, type BadgeTone } from "@/components/ui/badge";

/**
 * Passport type badge — fixed color per type from the design system:
 *   STANDARD → Trust Teal · REFERRAL → Deep Indigo · BREAK_GLASS → Alert Coral
 */
const TYPE_CONFIG: Record<
  PassportType,
  { label: string; tone: BadgeTone }
> = {
  STANDARD: { label: "Standard", tone: "teal" },
  REFERRAL: { label: "Referral", tone: "indigo" },
  BREAK_GLASS: { label: "Break-Glass", tone: "coral" },
};

export function PassportTypeTag({
  type,
  pulse = false,
  className,
}: {
  type: PassportType;
  pulse?: boolean;
  className?: string;
}) {
  const config = TYPE_CONFIG[type];
  return (
    <Badge tone={config.tone} pulse={pulse} className={className}>
      {config.label}
    </Badge>
  );
}