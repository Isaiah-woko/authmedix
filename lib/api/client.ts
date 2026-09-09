import { USE_MOCKS } from "@/lib/flags";
import { mockRequest } from "@/lib/mocks/mock-server";
import type { ApiErrorBody } from "@/types/api";
import type { PatientIdentity } from "@/types/patient";

/**
 * The single error type thrown by every API call in this app.
 * Mock mode throws MockApiError with the same fields, caught duck-typed.
 */
export class ApiClientError extends Error {
  status: number;
  reason?: string;
  locked?: boolean;
  patient?: PatientIdentity;

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

async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  if (USE_MOCKS) {
    return mockRequest<T>(endpoint, options);
  }

  const { method = "GET", body } = options;

  let response: Response;
  try {
    response = await fetch(`/api${endpoint}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiClientError("Network error. Check your connection and try again.", 0);
  }

  // Session missing or expired means full re-login, never a silent refresh.
  if (response.status === 401) {
    if (typeof window !== "undefined") {
      // Intentional full reload: session expiry must wipe every piece of
      // client state. A router push would keep stale state alive.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/login";
    }
    throw new ApiClientError("Session expired. Please sign in again.", 401);
  }

  let data: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const err = (data ?? {}) as ApiErrorBody;
    const apiError = new ApiClientError(
      err.error ?? err.message ?? `Request failed (${response.status})`,
      response.status,
      err.reason ?? err.denyReason,
      err.locked
    );
    apiError.patient = err.patient;
    throw apiError;
  }

  return data as T;
}

export const api = {
  get: <T>(endpoint: string) => apiRequest<T>(endpoint),
  post: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, { method: "POST", body }),
  patch: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, { method: "PATCH", body }),
};