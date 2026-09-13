/**
 * Countdown math shared by passport panels, the OTP input, the session TTL bar,
 * and the break-glass banner. Pure functions — the ticking itself lives in
 * Phase 4's useCountdown hook.
 *
 * Every clinical countdown is driven by server-supplied timestamps (passport
 * expiresAt, sessionExpiresAt) — never hardcoded TTLs (HANDOFF §1). The ONE
 * exception is the login OTP: the API returns no expiry, so we count down
 * OTP_TTL_MS from the moment login returned codeSent (HANDOFF §0).
 */

import { OTP_TTL_MS } from "./constants";

export function msUntil(iso: string | Date): number {
  return new Date(iso).getTime() - Date.now();
}

export function isPast(iso: string | Date): boolean {
  return msUntil(iso) <= 0;
}

/** "1:59:32", "0:05:12" — H:MM:SS, the format the protocol copy uses
 *  ("Emergency access active — expires in 2:00:00"). */
export function formatHMS(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Convenience for server-timestamped expiries. */
export function countdownTo(iso: string | Date): string {
  return formatHMS(msUntil(iso));
}

/** Amber zone — under 15 minutes remaining. */
export function isExpiringSoon(iso: string | Date): boolean {
  const ms = msUntil(iso);
  return ms > 0 && ms <= 15 * 60 * 1000;
}

/** Coral zone — under 5 minutes remaining. */
export function isCritical(iso: string | Date): boolean {
  const ms = msUntil(iso);
  return ms > 0 && ms <= 5 * 60 * 1000;
}

/* ── Login OTP: client-side 5:00 from codeSent (no expiry in the API) ── */

export function otpCountdown(sentAt: number | Date): string {
  const deadline = new Date(sentAt).getTime() + OTP_TTL_MS;
  return formatHMS(deadline - Date.now());
}

export function isOtpExpired(sentAt: number | Date): boolean {
  return Date.now() >= new Date(sentAt).getTime() + OTP_TTL_MS;
}