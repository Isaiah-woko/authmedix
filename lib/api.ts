/**
 * MediTrust API client — the ONLY place that talks to the backend.
 *
 * Encodes the global rules from HANDOFF §2:
 *  - credentials: "include" on every call (HttpOnly cookie flows automatically)
 *  - error envelopes checked in order: patient-access 403 { reason },
 *    auth 401 { error }, lockout 403 { locked }, generic { error, details? }
 *  - 401 unauthorized/session_expired → full logout + redirect to /login
 *    (never for invalid_credentials/invalid_code — those happen ON /login)
 *  - 403 password_change_required → redirect to /set-password
 *  - everything else is returned to the caller as a typed failure result
 *
 * After verify-code and set-password the browser picks up the new Set-Cookie
 * automatically (HANDOFF §6) — nothing to do client-side.
 */

import {
  API_ERROR_CODES,
  isAuthErrorBody,
  isLockedBody,
  type AdminPassport,
  type AdminStats,
  type ApiErrorBody,
  type ApiResult,
  type ApproveRequestFormValues,
  type ApproveResult,
  type AuditFilters,
  type AuditQueryResult,
  type BreakGlassFormValues,
  type BreakGlassResult,
  type CreateStaffFormValues,
  type DenyRequestFormValues,
  type DenyResult,
  type FlaggedEvent,
  type ForceResetResult,
  type GrantPassportFormValues,
  type LoginResponse,
  type LoginFormValues,
  type MyPassport,
  type PassportCore,
  type PatientRegistered,
  type PatientSearchResult,
  type PatientView,
  type RecordCreated,
  type RecordDetail,
  type RegisterPatientFormValues,
  type RequestAccessFormValues,
  type PassportRequest,
  type RequestStatus,
  type ReviewFlaggedFormValues,
  type RevokePassportFormValues,
  type SetPasswordResponse,
  type StaffCreated,
  type StaffMember,
  type StaffStatusUpdated,
  type StepUpIssued,
  type VerifyCodeResponse,
  type AddRecordFormValues,
} from "@/types";
import { redirectToLogin, redirectToSetPassword } from "./auth-client";

type HttpMethod = "GET" | "POST" | "PATCH";

interface RequestOptions {
  /** Skip the global 401/403 side effects (session probes). */
  silent?: boolean;
}

/** Guards against 5 parallel failures triggering 5 redirects. */
let globalRedirectInFlight = false;

function handleGlobalSideEffects(status: number, body: ApiErrorBody | null): void {
  if (globalRedirectInFlight) return;

  // 401 unauthorized / session_expired → full logout + /login (HANDOFF §1).
  // invalid_credentials / invalid_code are also 401s but happen on the public
  // login screens — never redirect on those.
  if (
    status === 401 &&
    isAuthErrorBody(body) &&
    (body.error === "unauthorized" || body.error === "session_expired")
  ) {
    globalRedirectInFlight = true;
    redirectToLogin();
    return;
  }

  // mustChangePassword gate — every non-auth route returns this while true.
  if (
    status === 403 &&
    body &&
    "error" in body &&
    body.error === API_ERROR_CODES.PASSWORD_CHANGE_REQUIRED
  ) {
    globalRedirectInFlight = true;
    redirectToSetPassword();
  }
}

async function parseBody(res: Response): Promise<unknown> {
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Core transport. Returns a discriminated result — never throws on HTTP errors. */
export async function request<TSuccess>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  options: RequestOptions = {}
): Promise<ApiResult<TSuccess>> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      credentials: "include",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 0, body: null };
  }

  const parsed = await parseBody(res);

  if (res.ok) {
    return { ok: true, status: res.status, data: parsed as TSuccess };
  }

  const errorBody = (parsed ?? null) as ApiErrorBody | null;

  // Exclude auth endpoints from global 401 redirects.
  // A 401 on login/verify means "wrong credentials", not "session expired".
  const isAuthEndpoint =
    path.includes("/api/auth/login") ||
    path.includes("/api/auth/verify-code");

  if (!options.silent && !isAuthEndpoint) {
    handleGlobalSideEffects(res.status, errorBody);
  }

  return { ok: false, status: res.status, body: errorBody };
}
/* Typed endpoint client */

export const api = {
  auth: {
    /** Screen 1. Errors: 401 invalid_credentials (generic!), 403 locked, 429. */
    login: (body: LoginFormValues) =>
      request<LoginResponse>("POST", "/api/auth/login", body),

    /** Screen 2. Resend = call login again with the same credentials. */
    verifyCode: (body: { healthId: string; code: string }) =>
      request<VerifyCodeResponse>("POST", "/api/auth/verify-code", body),

    /** Screen 3 (forced) + stretch voluntary change. New Set-Cookie applies
     *  automatically; route to Dashboard on success. */
    setPassword: (body: { newPassword: string; currentPassword?: string }) =>
      request<SetPasswordResponse>("POST", "/api/auth/set-password", body),

    // getSession / signOut live in lib/auth-client.ts (raw fetch, silent).
  },

  patients: {
    /** Screen 5 — identity only, cross-hospital. NEVER implies access status. */
    search: (query?: string) =>
      request<PatientSearchResult[]>(
        "GET",
        query ? `/api/patients?query=${encodeURIComponent(query)}` : "/api/patients"
      ),

    /** Screen 13 — register + optional care-team assignment in one call. */
    register: (values: RegisterPatientFormValues) =>
      request<PatientRegistered>("POST", "/api/patients", toRegisterPatientBody(values)),

    /** THE zero-trust call (Screen 6). 200 → PatientView (role-filtered, render
     *  as-is). 403 { reason } → no-access state. 404 → unknown patient. */
    view: (patientId: string) => request<PatientView>("GET", `/api/patients/${patientId}`),
  },

  records: {
    /** Screen 8. UPLOAD = OCR'd text as content — there is no file endpoint. */
    create: (body: AddRecordFormValues) => request<RecordCreated>("POST", "/api/records", body),
    detail: (recordId: string) => request<RecordDetail>("GET", `/api/records/${recordId}`),
  },

  passportRequests: {
    /** Admin: ?status=PENDING → hospital queue. Clinical: own requests. */
    list: (status?: RequestStatus) =>
      request<PassportRequest[]>(
        "GET",
        status ? `/api/passport-requests?status=${status}` : "/api/passport-requests"
      ),

    /** Screen 7. Server pre-fills purpose/scope from role if omitted. */
    create: (body: RequestAccessFormValues) =>
      request<PassportRequest>("POST", "/api/passport-requests", body),

    /** Screen 10 — REQUIRES step-up otpCode (single-use). */
    approve: (requestId: string, body: ApproveRequestFormValues) =>
      request<ApproveResult>("POST", `/api/passport-requests/${requestId}/approve`, body),

    /** denialReason is mandatory. */
    deny: (requestId: string, body: DenyRequestFormValues) =>
      request<DenyResult>("POST", `/api/passport-requests/${requestId}/deny`, body),
  },

  passports: {
    /** Screen 4 clinical feed — only currently-valid passports, soonest expiry first. */
    mine: () => request<MyPassport[]>("GET", "/api/passports/mine"),

    /** Screen 11 revoke list. */
    activeList: (patientId?: string) =>
      request<AdminPassport[]>(
        "GET",
        patientId
          ? `/api/passports?active=true&patientId=${encodeURIComponent(patientId)}`
          : "/api/passports?active=true"
      ),

    /** Screen 11 grant/referral — REQUIRES step-up otpCode. REFERRAL duration is
     *  ignored server-side (fixed 48h). Referral names the receiver by healthId. */
    grant: (body: GrantPassportFormValues) =>
      request<PassportCore>("POST", "/api/passports", body),

    /** STANDARD/REFERRAL only — never offered for BREAK_GLASS. */
    renew: (passportId: string) =>
      request<PassportCore>("POST", `/api/passports/${passportId}/renew`),

    /** Immediate effect. Never offered for BREAK_GLASS (it runs its own clock). */
    revoke: (passportId: string, body: RevokePassportFormValues) =>
      request<PassportCore>("POST", `/api/passports/${passportId}/revoke`, body),
  },

  /** Screen 9 — clinical roles only; Admin gets 403. confirmedEmergency must be
   *  literal true; the "No" path never calls this. */
  breakGlass: (body: BreakGlassFormValues) =>
    request<BreakGlassResult>("POST", "/api/break-glass", body),

  admin: {
    /** Admin dashboard counters (HANDOFF §3.10). */
    stats: () => request<AdminStats>("GET", "/api/admin/stats"),

    /** Step-up 2FA: issues a fresh single-use code (dev console in dev). */
    stepUp: () => request<StepUpIssued>("POST", "/api/admin/step-up"),

    staff: {
      list: () => request<StaffMember[]>("GET", "/api/admin/staff"),

      /** REQUIRES step-up otpCode. tempPassword in the response is display-once. */
      create: (body: CreateStaffFormValues) =>
        request<StaffCreated>("POST", "/api/admin/staff", body),

      /** SUSPENDED auto-revokes all their ACTIVE passports server-side. */
      setStatus: (staffId: string, status: "ACTIVE" | "SUSPENDED") =>
        request<StaffStatusUpdated>("PATCH", `/api/admin/staff/${staffId}`, { status }),

      /** Incident lever: mustChangePassword=true + kills live sessions instantly. */
      forceReset: (staffId: string) =>
        request<ForceResetResult>("POST", `/api/admin/staff/${staffId}/force-reset`),
    },

    /** Screen 14 queue. highPriority rows surface first. */
    flaggedQueue: () =>
      request<FlaggedEvent[]>("GET", "/api/admin/audit?flagged=true&reviewed=false"),

    /** NOTE: :id is the AccessPassport id (the queue row's id), not an audit row id. */
    reviewFlagged: (passportId: string, body: ReviewFlaggedFormValues) =>
      request<PassportCore>("POST", `/api/admin/audit/${passportId}/review`, body),
  },

  audit: {
    /** Screen 15 — hospital-scoped server-side; max limit 1000. */
    query: (filters: AuditFilters = {}) => {
      const params = new URLSearchParams();
      if (filters.userId) params.set("userId", filters.userId);
      if (filters.patientId) params.set("patientId", filters.patientId);
      if (filters.action) params.set("action", filters.action);
      if (filters.outcome) params.set("outcome", filters.outcome);
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);
      if (filters.limit !== undefined) params.set("limit", String(filters.limit));
      if (filters.offset !== undefined) params.set("offset", String(filters.offset));
      const qs = params.toString();
      return request<AuditQueryResult>("GET", qs ? `/api/audit?${qs}` : "/api/audit");
    },
  },
};

/** Strip empty arrays so the body matches the optional shape in HANDOFF §3.4. */
function toRegisterPatientBody(values: RegisterPatientFormValues) {
  return {
    name: values.name,
    dob: values.dob,
    ...(values.allergies.length > 0 ? { allergies: values.allergies } : {}),
    ...(values.careTeam.length > 0 ? { careTeam: values.careTeam } : {}),
  };
}

/* ── Calm, human copy for the generic error envelope ─────────────────
   Patient-access denials ({ reason }) are NOT errors — screens render them
   as deliberate no-access states and never reach this function. */

export function describeApiError(failure: {
  status: number;
  body: ApiErrorBody | null;
}): string {
  const { status, body } = failure;

  if (status === 0) {
    return "Connection problem. Check your network and try again.";
  }

  if (isLockedBody(body)) {
    return "This account is locked after too many failed attempts. Contact your admin.";
  }

  if (isAuthErrorBody(body)) {
    switch (body.error) {
      case "invalid_credentials":
        return "Invalid credentials."; // generic on purpose — never say which field
      case "invalid_code":
        return "That code is incorrect or has expired.";
      case "session_expired":
        return "Your session has ended. Sign in again to continue.";
      default:
        return "You need to sign in to continue.";
    }
  }

  if (body && "error" in body) {
    const details = "details" in body ? body.details : undefined;
    const detailText =
      Array.isArray(details) && details.length > 0 ? ` ${details.join(" ")}` : "";

    switch (body.error) {
      case API_ERROR_CODES.RATE_LIMITED:
        return "Too many attempts. Wait a moment and try again.";
      case API_ERROR_CODES.STEP_UP_VERIFICATION_FAILED:
        return "The verification code was incorrect or has expired. Request a fresh code and try again.";
      case API_ERROR_CODES.WEAK_PASSWORD:
        return `Password does not meet the strength rules.${detailText}`;
      case API_ERROR_CODES.CURRENT_PASSWORD_REQUIRED:
        return "Enter your current password.";
      case API_ERROR_CODES.INVALID_CURRENT_PASSWORD:
        return "Your current password is incorrect.";
      case API_ERROR_CODES.EMAIL_ALREADY_EXISTS:
        return "A staff account with this email already exists.";
      case API_ERROR_CODES.FORBIDDEN_AUTHORING:
        return "Your role can't create this record type.";
      case API_ERROR_CODES.FORBIDDEN_CROSS_HOSPITAL:
        return "This action involves another hospital's data.";
      case API_ERROR_CODES.FORBIDDEN_ADMIN_CANNOT_BREAK_GLASS:
        return "Admins cannot use Break-Glass.";
      case API_ERROR_CODES.CANNOT_SUSPEND_SELF:
      case API_ERROR_CODES.CANNOT_FORCE_RESET_SELF:
        return "You can't perform this action on your own account.";
      case API_ERROR_CODES.BREAK_GLASS_NOT_RENEWABLE:
        return "Break-Glass access can't be renewed — it must be invoked again.";
      case API_ERROR_CODES.PASSPORT_NOT_RENEWABLE:
        return "This passport can't be renewed — request access again.";
      case API_ERROR_CODES.BREAK_GLASS_CANNOT_BE_REVOKED:
        return "Break-Glass access expires on its own — it can't be revoked.";
      case API_ERROR_CODES.PASSPORT_ALREADY_INACTIVE:
        return "This passport is already inactive.";
      case API_ERROR_CODES.PATIENT_NOT_FOUND:
        return "Patient not found.";
      case API_ERROR_CODES.TARGET_USER_NOT_FOUND_OR_INACTIVE:
        return "No active staff member matches that Health ID.";
      case API_ERROR_CODES.REQUEST_NOT_FOUND_OR_ALREADY_REVIEWED:
        return "This request was already reviewed.";
      case API_ERROR_CODES.EVENT_NOT_FOUND_OR_NOT_FLAGGED:
        return "This event was already reviewed.";
      case API_ERROR_CODES.INVALID_CARE_TEAM_MEMBER:
        return "One of the care-team entries is invalid.";
      case API_ERROR_CODES.PASSWORD_CHANGE_REQUIRED:
        return "Set a new password to continue.";
      case "ROLE_DENIED":
        return "Your passport for this patient doesn't cover this record type.";
      default:
        return "Something went wrong. Try again.";
    }
  }

  return "Something went wrong. Try again.";
}