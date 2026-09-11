/** The single error type thrown by every API call in this app. */
export class ApiClientError extends Error {
    status: number;
  reason?: string;
  locked?: boolean;
  patient?: { id: string; name: string; patientCode: string };
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

async function readErrorBody(response: Response): Promise<ErrorBody | null> {
  try {
    const text = await response.text();
    return text ? (JSON.parse(text) as ErrorBody) : null;
  } catch {
    return null;
  }
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

  if (response.status === 401) {
    const errBody = await readErrorBody(response);
    const key = errBody?.error ?? "unauthorized";
    if (key === "unauthorized" || key === "session_expired") {
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/login";
      }
    }
    throw new ApiClientError(humanize(errBody, 401), 401, key);
  }

  if (response.status === 403) {
    const errBody = await readErrorBody(response);
    const key = errBody?.error ?? "forbidden";
    if (key === "password_change_required") {
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/set-password")) {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/set-password";
      }
    }
        const forbiddenError = new ApiClientError(humanize(errBody, 403), 403, errBody?.reason ?? key);
    forbiddenError.patient = errBody?.patient;
    throw forbiddenError;
  }

  if (!response.ok) {
    const errBody = await readErrorBody(response);
    const locked = response.status === 423;
    throw new ApiClientError(
      humanize(errBody, response.status),
      response.status,
      errBody?.error,
      locked
    );
  }

  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export const api = {
  get: <T>(endpoint: string) => apiRequest<T>(endpoint),
  post: <T>(endpoint: string, body?: unknown) => apiRequest<T>(endpoint, { method: "POST", body }),
  patch: <T>(endpoint: string, body?: unknown) => apiRequest<T>(endpoint, { method: "PATCH", body }),
};