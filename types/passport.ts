import type { Role } from "./session";

export type PassportType = "STANDARD" | "REFERRAL" | "BREAK_GLASS";
export type PassportStatus = "ACTIVE" | "EXPIRED" | "REVOKED";

/** The only admin-selectable durations (fixed clinical presets, never freeform). */
export type DurationPreset = "8H" | "24H";

/** Fixed clinical protocol list — never free text (HANDOFF §3.8). */
export type BreakGlassReason =
  | "LIFE_THREATENING"
  | "UNCONSCIOUS_UNRESPONSIVE"
  | "MEDICATION_ALLERGY_EMERGENCY"
  | "TRAUMA"
  | "CRITICAL_DIAGNOSTIC_INFO"
  | "OTHER";

/** Fields common to every passport payload. */
export interface PassportCore {
  id: string;
  type: PassportType;
  status: PassportStatus;
  purpose: string;
  /** Backend does not document a fixed vocabulary — keep as string[] and
   *  render verbatim. Never filter client-side. */
  scope: string[];
  expiresAt: string;
  renewalCount: number;
  flagged: boolean;
  createdAt: string;
}

/** GET /api/passports/mine — clinical dashboard rows (soonest expiry first). */
export type MyPassport = PassportCore & {
  patient: {
    id: string;
    name: string;
    patientCode: string;
    hospitalId: string;
  };
};

/** GET /api/passports?active=true — admin list rows. */
export type AdminPassport = PassportCore & {
  user: { id: string; name: string; role: Role; healthId: string };
  patient: { id: string; name: string; patientCode: string };
};

/** POST /api/break-glass response. */
export interface BreakGlassResult {
  passportId: string;
  expiresAt: string;
}
