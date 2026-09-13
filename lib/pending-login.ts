/**
 * Carries step-1 credentials from Login to the OTP screen so "Resend code"
 * can call POST /api/auth/login again with the same credentials (HANDOFF §0).
 *
 * Deliberately scoped demo pragmatism: sessionStorage only (dies with the tab),
 * wiped the moment verify-code succeeds or the Login screen mounts again.
 * The real session lives in the HttpOnly cookie — never here.
 */

const KEY = "meditrust.pending-login";

export interface PendingLogin {
  healthId: string;
  email: string;
  password: string;
  /** Epoch ms when login returned codeSent — drives the client 5:00 countdown. */
  sentAt: number;
}

export function setPendingLogin(pending: PendingLogin): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(KEY, JSON.stringify(pending));
}

export function getPendingLogin(): PendingLogin | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingLogin;
  } catch {
    return null;
  }
}

export function updatePendingLoginSentAt(sentAt: number): void {
  const current = getPendingLogin();
  if (current) setPendingLogin({ ...current, sentAt });
}

export function clearPendingLogin(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(KEY);
}