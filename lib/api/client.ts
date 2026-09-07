import type { ApiErrorBody } from "@/types/api";

/**
 * The single error type thrown by every API call in this app.
 * status = HTTP code (0 = network failure)
 * reason = access-denied reason (NO_PASSPORT / PASSPORT_EXPIRED / PASSPORT_REVOKED)
 * locked = account locked after repeated failed attempts
 */
export class ApiClientError extends Error {
  status: number;
  reason?: string;
  locked?: boolean;

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
  const { method = "GET", body } = options;

  let response: Response;
  try {
    response = await fetch(`/api${endpoint}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiClientError("Network error — check your connection and try again.", 0);
  }

  // Session missing/expired → full re-login, never a silent refresh (by design)
  if (response.status === 401) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new ApiClientError("Session expired — please sign in again.", 401);
  }

  // Read the body once; some endpoints may return an empty body
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
    throw new ApiClientError(
      err.error ?? err.message ?? `Request failed (${response.status})`,
      response.status,
      err.reason ?? err.denyReason, // accept both contract spellings
      err.locked
    );
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