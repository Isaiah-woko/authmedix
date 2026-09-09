"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ACCESS_STATE_COPY } from "@/lib/access";
import type { DenyState } from "@/lib/access";
import { ROUTES } from "@/lib/routes";
import { useSession } from "@/providers/session-provider";
import type { PatientIdentity } from "@/types/patient";

const tones: Record<DenyState, string> = {
  NO_PASSPORT: "border-section-line bg-white",
  PASSPORT_EXPIRED: "border-amber-watch/40 bg-amber-watch/10",
  PASSPORT_REVOKED: "border-alert-coral/40 bg-alert-coral/10",
};

export function NoAccessState({
  state,
  patient,
}: {
  state: DenyState;
  patient: PatientIdentity | null;
}) {
  const router = useRouter();
  const { session } = useSession();
  const copy = ACCESS_STATE_COPY[state];
  const isAdmin = session?.user.role === "ADMIN";

  return (
    <section className={`max-w-lg rounded border p-6 ${tones[state]}`}>
      {patient ? (
        <>
          <p className="text-section-header font-semibold text-ink">{patient.name}</p>
          <p className="identifier mt-1 text-dense text-slate">{patient.patientCode}</p>
        </>
      ) : null}
      <h2 className="mt-4 text-body-lg font-semibold text-ink">{copy.headline}</h2>
      <p className="mt-1 text-body text-slate">{copy.body}</p>
      {patient ? (
        <div className="mt-5 flex gap-3">
          <Button variant="secondary" onClick={() => router.push(ROUTES.requestAccess(patient.id))}>
            Request Access
          </Button>
          {!isAdmin && (
            <Button variant="danger" onClick={() => router.push(ROUTES.breakGlass(patient.id))}>
              Break Glass
            </Button>
          )}
        </div>
      ) : null}
    </section>
  );
}