import type { PatientRecord } from "./record";
import type { PassportType } from "./passport";

/** GET /api/patients search row — identity only, cross-hospital.
 *  NEVER implies access status; that resolves only when the patient is opened. */
export interface PatientSearchResult {
  id: string;
  name: string;
  patientCode: string;
  hospitalId: string;
}

/** Passport embedded in an ALLOWED patient payload. */
export interface PatientViewPassport {
  id: string;
  type: PassportType;
  expiresAt: string;
  renewalCount: number;
}

/** GET /api/patients/:id on allow — already role-filtered server-side.
 *  Render exactly as-is; never add client-side filtering. */
export interface PatientView {
  id: string;
  patientCode: string;
  name: string;
  dob: string;
  /** Omitted ENTIRELY when the role may not see it (Lab, Admin).
   *  Check with `"allergies" in payload` — never by length. */
  allergies?: string[];
  /** Only the record types this role may see (server-filtered). */
  records: PatientRecord[];
  /** Present only on allow. Drives the passport panel + countdown. */
  passport?: PatientViewPassport;
}

/** 403 body from GET /api/patients/:id — exact strings from the backend. */
export type PatientDenyReason =
  | "NO_PASSPORT"
  | "PASSPORT_EXPIRED"
  | "PASSPORT_REVOKED";

export interface PatientAccessDenied {
  reason: PatientDenyReason;
}

/** Discriminated result the record view renders from (Phase 9). */
export type PatientAccessResult =
  | { status: "allowed"; data: PatientView }
  | { status: "denied"; reason: PatientDenyReason }
  | { status: "not_found" };

/** POST /api/patients response. */
export interface PatientRegistered {
  id: string;
  patientCode: string;
}