export type AuditAction =
  | "LOGIN"
  | "LOGIN_FAILED"
  | "OTP_VERIFIED"
  | "PASSWORD_CHANGED"
  | "SEARCH"
  | "VIEW_RECORD"
  | "CREATE_RECORD"
  | "REQUEST_ACCESS"
  | "PASSPORT_GRANTED"
  | "PASSPORT_APPROVED"
  | "PASSPORT_DENIED"
  | "PASSPORT_RENEWED"
  | "PASSPORT_REVOKED"
  | "BREAK_GLASS"
  | "STAFF_SUSPENDED"
  | "STAFF_UNLOCKED";

export type AuditOutcome = "SUCCESS" | "DENIED" | "FLAGGED";

export interface AuditLogEntry {
  id: string;
  userId: string;
  userName?: string;
  patientId?: string;
  patientName?: string;
  action: AuditAction;
  outcome: AuditOutcome;
  flagged: boolean;
  reviewed: boolean;
  reviewNote?: string;
  timestamp: string;
  reasonCategory?: string;
  reasonDetail?: string;
}

export interface AuditFilter {
  userId?: string;
  patientId?: string;
  action?: AuditAction;
  startDate?: string;
  endDate?: string;
}