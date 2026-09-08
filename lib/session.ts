import type { Session } from "@/types/session";

export function isSessionValid(session: Session | null): boolean {
  if (!session?.sessionExpiresAt) return false;
  return new Date(session.sessionExpiresAt).getTime() > Date.now();
}

export function mustChangePassword(session: Session | null): boolean {
  return session?.user.mustChangePassword === true;
}

export function isUserSuspended(session: Session | null): boolean {
  return session?.user.status === "SUSPENDED";
}

/** Where the OTP screen keeps the one-time code's expiry (ISO string). */
export const CODE_EXPIRY_STORAGE_KEY = "meditrust.codeExpiresAt";

export function storeCodeExpiry(iso: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(CODE_EXPIRY_STORAGE_KEY, iso);
}

export function readCodeExpiry(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(CODE_EXPIRY_STORAGE_KEY);
}

export function clearCodeExpiry(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(CODE_EXPIRY_STORAGE_KEY);
}