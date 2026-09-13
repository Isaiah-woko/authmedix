import { PatientCodeDisplay } from "./patient-code-display";
import { formatDate, cn } from "@/lib/utils";

/**
 * Identity-only patient card — name + patientCode (mono) + DOB.
 * Used in search results and all three no-access states (Screen 6).
 * NEVER shows access status, records, or allergies.
 */
export function PatientIdentityCard({
  name,
  patientCode,
  dob,
  hospitalId,
  className,
}: {
  name: string;
  patientCode: string;
  dob?: string;
  hospitalId?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <p className="text-body font-medium text-ink">{name}</p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
        <PatientCodeDisplay code={patientCode} />
        {dob ? (
          <span className="text-data text-slate-ink">{formatDate(dob)}</span>
        ) : null}
        {hospitalId ? (
          <span className="text-data text-slate-ink-soft">{hospitalId}</span>
        ) : null}
      </div>
    </div>
  );
}