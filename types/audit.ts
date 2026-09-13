import type { Role } from "./session";
import type { BreakGlassReason } from "./passport";

/** Full action vocabulary from HANDOFF §3.9 (SEARCH is deliberately absent). */
export const AUDIT_ACTIONS = [
  "LOGIN_FAILED",
  "LOGIN_OTP_ISSUED",
  "LOGIN_SUCCESS",
  "VERIFY_CODE_FAILED",
  "PASSWORD_CHANGED",
  "PASSWORD_CHANGE_FAILED",
  "SYSTEM_BOOTSTRAP",
  "STEP_UP_CODE_ISSUED",
  "STAFF_CREATED",
  "STAFF_CREATE_STEP_UP_FAILED",
  "STAFF_STATUS_UPDATED",
  "PASSPORTS_REVOKED_ON_SUSPENSION",
  "PASSWORD_RESET_FORCED",
  "PATIENT_REGISTERED",
  "REQUEST_ACCESS",
  "PASSPORT_REQUEST_APPROVED",
  "PASSPORT_REQUEST_DENIED",
  "PASSPORT_GRANTED",
  "PASSPORT_GRANT_STEP_UP_FAILED",
  "APPROVE_STEP_UP_FAILED",
  "PASSPORT_RENEWED",
  "PASSPORT_REVOKED",
  "BREAK_GLASS",
  "BREAK_GLASS_REVIEWED",
  "CREATE_RECORD",
  "VIEW_PATIENT",
  "VIEW_RECORD",
  "SEED_DATA_LOADED",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type AuditOutcome = "ALLOWED" | "DENIED";

export interface AuditUserRef {
  id: string;
  name: string;
  role: Role;
  healthId: string;
}

/** Row from GET /api/audit → logs[]. */
export interface AuditLogRow {
  id: string;
  /** null for system events (HANDOFF §3.9). */
  userId: string | null;
  patientId: string | null;
  /** Union + string escape hatch: a new backend action never breaks the UI,
   *  but known actions still autocomplete in filters. */
  action: AuditAction | (string & {});
  outcome: AuditOutcome;
  reason: string | null;
  flagged: boolean;
  createdAt: string;
  user?: AuditUserRef | null;
}

/** Row from GET /api/admin/audit?flagged=true&reviewed=false. */
export interface FlaggedEvent {
  /** The AccessPassport id — this is what POST /api/admin/audit/:id/review wants. */
  id: string;
  type: "BREAK_GLASS";
  reasonCategory: BreakGlassReason;
  /** Always present — required for every category, not just OTHER. */
  reasonDetail: string;
  flagged: boolean;
  reviewed: boolean;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  expiresAt: string;
  user: { id: string; name: string; role: Role; healthId: string };
  patient: { id: string; name: string; patientCode: string };
  reviewedBy?: { id: string; name: string } | null;
  /** Same worker has >1 break-glass event — surface above routine rows
   *  with an Amber "high priority" tag. */
  highPriority: boolean;
}

/** GET /api/audit response (paginated). */
export interface AuditQueryResult {
  logs: AuditLogRow[];
  total: number;
  limit: number;
  offset: number;
}