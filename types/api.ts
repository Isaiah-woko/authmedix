import type { PatientDenyReason } from "./patient";
import type { Role } from "./session";

/* ── Error envelopes — the three shapes from HANDOFF §2, checked in order ── */

/** 1. Patient-access denial — 403 from patient-data routes. */
export interface PatientAccessErrorBody {
  reason: PatientDenyReason;
}

/** 2. Auth/session problems — 401. */
export type AuthErrorCode =
  | "unauthorized"
  | "invalid_credentials"
  | "invalid_code"
  | "session_expired";

export interface AuthErrorBody {
  error: AuthErrorCode;
}

/** 3. Everything else — 400/403/404/409/429. */
export interface GenericErrorBody {
  error: string;
  details?: unknown;
}

/** Special: lockout — 403 from login/verify-code. */
export interface LockedBody {
  locked: true;
}

export type ApiErrorBody =
  | PatientAccessErrorBody
  | AuthErrorBody
  | LockedBody
  | GenericErrorBody;

/* Type guards — lib/api.ts (Phase 3) uses these to dispatch. */

export function isPatientAccessError(body: unknown): body is PatientAccessErrorBody {
  return (
    !!body &&
    typeof body === "object" &&
    "reason" in body &&
    ["NO_PASSPORT", "PASSPORT_EXPIRED", "PASSPORT_REVOKED"].includes(
      (body as { reason: string }).reason
    )
  );
}

export function isLockedBody(body: unknown): body is LockedBody {
  return !!body && typeof body === "object" && (body as { locked?: unknown }).locked === true;
}

export function isAuthErrorBody(body: unknown): body is AuthErrorBody {
  return (
    !!body &&
    typeof body === "object" &&
    typeof (body as { error?: unknown }).error === "string" &&
    ["unauthorized", "invalid_credentials", "invalid_code", "session_expired"].includes(
      (body as { error: string }).error
    )
  );
}

/* ── Known snake_case error codes → UI copy without magic strings ── */

export const API_ERROR_CODES = {
  RATE_LIMITED: "rate_limited",
  PASSWORD_CHANGE_REQUIRED: "password_change_required",
  STEP_UP_VERIFICATION_FAILED: "step_up_verification_failed",
  INVALID_REQUEST: "invalid_request",
  WEAK_PASSWORD: "weak_password",
  CURRENT_PASSWORD_REQUIRED: "current_password_required",
  INVALID_CURRENT_PASSWORD: "invalid_current_password",
  FORBIDDEN_AUTHORING: "forbidden_authoring",
  FORBIDDEN_CROSS_HOSPITAL: "forbidden_cross_hospital",
  FORBIDDEN_ADMIN_CANNOT_BREAK_GLASS: "forbidden_admin_cannot_break_glass",
  CANNOT_SUSPEND_SELF: "cannot_suspend_self",
  CANNOT_FORCE_RESET_SELF: "cannot_force_reset_self",
  EMAIL_ALREADY_EXISTS: "email_already_exists",
  PATIENT_NOT_FOUND: "patient_not_found",
  TARGET_USER_NOT_FOUND_OR_INACTIVE: "target_user_not_found_or_inactive",
  REQUEST_NOT_FOUND_OR_ALREADY_REVIEWED: "request_not_found_or_already_reviewed",
  EVENT_NOT_FOUND_OR_NOT_FLAGGED: "event_not_found_or_not_flagged",
  BREAK_GLASS_NOT_RENEWABLE: "break_glass_not_renewable",
  PASSPORT_NOT_RENEWABLE: "passport_not_renewable",
  BREAK_GLASS_CANNOT_BE_REVOKED: "break_glass_cannot_be_revoked",
  PASSPORT_ALREADY_INACTIVE: "passport_already_inactive",
  INVALID_CARE_TEAM_MEMBER: "invalid_care_team_member",
  BOOTSTRAP_ALREADY_COMPLETED: "bootstrap_already_completed",
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

/* ── Result wrapper lib/api.ts returns (Phase 3) ── */

export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; body: ApiErrorBody | null };

/* ── Small response shapes ── */

export interface LoginResponse {
  codeSent: true;
}

export interface VerifyCodeResponse {
  ok: boolean;
  mustChangePassword: boolean;
  sessionExpiresAt: string;
}

export interface SetPasswordResponse {
  ok: boolean;
  sessionExpiresAt: string;
}

/** POST /api/admin/step-up response. */
export interface StepUpIssued {
  codeSent: true;
}

/** GET /api/admin/stats (HANDOFF §3.10). */
export interface AdminStats {
  staffCount: number;
  patientCount: number;
  pendingRequests: number;
  unreviewedFlagged: number;
}

/** POST /api/admin/staff/:id/force-reset also returns this shape. */
export interface OkResponse {
  ok: boolean;
}

/** Unused type import guard — Role appears in payloads typed elsewhere. */
export type { Role };