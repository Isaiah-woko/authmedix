/** The single error type thrown by every API call in this app. */
export class ApiClientError extends Error {
  status: number;
  reason?: string;
  locked?: boolean;
  patient?: { id: string; name: string; patientCode: string };
  detail?: string;
  constructor(message: string, status: number, reason?: string, locked?: boolean) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.reason = reason;
    this.locked = locked;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
}

interface ErrorBody {
  error?: string;
  message?: string;
  reason?: string;
  patient?: { id: string; name: string; patientCode: string };
}

const HUMAN: Record<string, string> = {
  invalid_credentials: "Invalid credentials. Check your Health ID, email and password.",
  invalid_code: "Wrong verification code.",
  code_expired: "Code expired. Send a new one.",
  locked: "Account locked after repeated failed attempts. Contact your administrator.",
  suspended: "This account is suspended. Contact your administrator.",
  rate_limited: "Too many attempts. Wait a moment and try again.",
  unauthorized: "Session expired. Please sign in again.",
  session_expired: "Session expired. Please sign in again.",
  password_change_required: "Set a new password before continuing.",
  forbidden: "Access denied.",
  target_user_not_found_or_inactive: "Target worker not found or inactive.",
  break_glass_cannot_be_revoked: "Break-glass passports cannot be revoked.",
  passport_already_inactive: "This passport is already inactive.",
  break_glass_cannot_be_renewed: "Break-glass passports cannot be renewed.",
  request_not_found: "Request not found or already reviewed.",
  event_not_found_or_not_flagged: "Event not found or not flagged.",
  step_up_verification_failed: "Verification code wrong or missing. Request a new one.",
  step_up_required: "Verification required. Request a new code.",
};

function humanize(body: ErrorBody | null, status: number): string {
  const key = body?.error ?? "";
  if (HUMAN[key]) return HUMAN[key];
  return body?.message ?? `Request failed (${status}).`;
}

async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body } = options;
  let response: Response;
  try {
    response = await fetch(`/api${endpoint}`, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: "same-origin",
    });
  } catch {
    throw new ApiClientError("Network error. Check your connection and try again.", 0);
  }

  const rawText = await response.text();
  let errBody: ErrorBody | null = null;
  if (rawText) {
    try {
      errBody = JSON.parse(rawText) as ErrorBody;
    } catch {
      errBody = null;
    }
  }

  if (response.status === 401) {
    const key = errBody?.error ?? "unauthorized";
    if (key === "unauthorized" || key === "session_expired") {
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/login";
      }
    }
    const err = new ApiClientError(humanize(errBody, 401), 401, key);
    err.detail = rawText || undefined;
    throw err;
  }

  if (response.status === 403) {
    const key = errBody?.error ?? "forbidden";
    if (key === "password_change_required") {
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/set-password")) {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/set-password";
      }
    }
    const err = new ApiClientError(humanize(errBody, 403), 403, errBody?.reason ?? key);
    err.patient = errBody?.patient;
    err.detail = rawText || undefined;
    throw err;
  }

  if (!response.ok) {
    const err = new ApiClientError(
      humanize(errBody, response.status),
      response.status,
      errBody?.error,
      response.status === 423
    );
    err.detail = rawText || undefined;
    throw err;
  }

  if (!rawText) return undefined as T;
  return JSON.parse(rawText) as T;
}

export const api = {
  get: <T>(endpoint: string) => apiRequest<T>(endpoint),
  post: <T>(endpoint: string, body?: unknown) => apiRequest<T>(endpoint, { method: "POST", body }),
  patch: <T>(endpoint: string, body?: unknown) => apiRequest<T>(endpoint, { method: "PATCH", body }),
};