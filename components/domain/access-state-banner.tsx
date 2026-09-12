"use client";

/**
 * The three no-access states, keyed off the EXACT reason string from
 * GET /api/patients/:id (HANDOFF §4). Each is a deliberate, visually distinct
 * state — never a spinner, never a generic error:
 *
 *   NO_PASSPORT      → Slate accent   — access never existed; ask or break glass
 *   PASSPORT_EXPIRED → Amber accent   — authorization lapsed (watch color)
 *   PASSPORT_REVOKED → Coral accent   — access was denied/withdrawn
 *
 * Expired and revoked copy is deliberately different (screen spec §6).
 * Actions render only for clinical roles — Admin can't request or break glass.
 */

import Link from "next/link";
import type { PatientDenyReason, PatientSearchResult } from "@/types";
import { isClinicalRole } from "@/types";
import { NO_ACCESS_COPY } from "@/lib/constants";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PatientIdentityCard } from "./patient-identity-card";

const STATE_CONFIG: Record<
  PatientDenyReason,
  { accent: string; titleClass: string }
> = {
  NO_PASSPORT: { accent: "border-l-slate-ink", titleClass: "text-ink" },
  PASSPORT_EXPIRED: { accent: "border-l-amber-watch", titleClass: "text-amber-watch" },
  PASSPORT_REVOKED: { accent: "border-l-alert-coral", titleClass: "text-alert-coral" },
};

export function AccessStateBanner({
  reason,
  identity,
  patientId,
}: {
  reason: PatientDenyReason;
  /** Identity-only lookup result (name/code are not access-gated). Null while resolving. */
  identity: PatientSearchResult | null;
  patientId: string;
}) {
  const { user } = useSession();
  const copy = NO_ACCESS_COPY[reason];
  const config = STATE_CONFIG[reason];
  const clinical = user !== null && isClinicalRole(user.role);

  return (
    <Card className={cn("border-l-4", config.accent)}>
      <CardContent className="space-y-4 p-5">
        {identity ? (
          <PatientIdentityCard
            name={identity.name}
            patientCode={identity.patientCode}
            hospitalId={identity.hospitalId}
          />
        ) : (
          <p className="text-body text-slate-ink">Patient record</p>
        )}

        <div>
          <p className={cn("text-section font-semibold", config.titleClass)}>{copy.title}</p>
          <p className="mt-1 max-w-xl text-body text-slate-ink">{copy.body}</p>
        </div>

        {clinical ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href={`/request-access/${patientId}`}>
              <Button variant="primary" size="sm" className="w-full sm:w-auto">
                Request access
              </Button>
            </Link>
            <Link href={`/break-glass/${patientId}`}>
              <Button variant="danger" size="sm" className="w-full sm:w-auto">
                Break glass
              </Button>
            </Link>
          </div>
        ) : (
          <p className="text-data text-slate-ink-soft">
            Access decisions for this patient are handled by clinical staff.
          </p>
        )}
      </CardContent>
    </Card>
  );
}