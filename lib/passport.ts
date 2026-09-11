/**
 * Passport display rules (HANDOFF §3.7 "Rules to encode in UI").
 * Presentation only — the backend is the authority on what is actually allowed.
 */

import type { PassportCore, PassportType } from "@/types";
import { PASSPORT_TYPE_META, type PassportTypeKey } from "./constants";

/** Visual identity per type — includes PENDING for request-queue badges. */
export function passportTypeMeta(type: PassportType | "PENDING") {
  return PASSPORT_TYPE_META[type as PassportTypeKey];
}

export function isBreakGlass(passport: Pick<PassportCore, "type">): boolean {
  return passport.type === "BREAK_GLASS";
}

/** Duration line for the passport panel (Screen 6).
 *  REFERRAL/BREAK_GLASS are fixed by protocol. STANDARD is inferred from the
 *  original window while renewalCount === 0; after renewals we show the count
 *  instead, because expiresAt has moved and the original preset is unrecoverable. */
export function durationLabel(
  passport: Pick<PassportCore, "type" | "createdAt" | "expiresAt" | "renewalCount">
): string {
  if (passport.type === "REFERRAL") return "48h fixed";
  if (passport.type === "BREAK_GLASS") return "2h fixed";
  if (passport.renewalCount > 0) return `Renewed ×${passport.renewalCount}`;
  const hours = Math.round(
    (new Date(passport.expiresAt).getTime() - new Date(passport.createdAt).getTime()) / 3_600_000
  );
  return hours > 12 ? "24h window" : "8h window";
}

/** Eligibility for the Renew button. OMIT the button entirely when false for
 *  BREAK_GLASS — never disable it (HANDOFF §3.7, Frontend Brief §4).
 *  Also requires ACTIVE + unexpired: the backend rejects dead passports with 400. */
export function isRenewable(
  passport: Pick<PassportCore, "type" | "status" | "expiresAt">
): boolean {
  return (
    passport.type !== "BREAK_GLASS" &&
    passport.status === "ACTIVE" &&
    new Date(passport.expiresAt).getTime() > Date.now()
  );
}

/** Revoke is never offered for BREAK_GLASS — it expires on its own 2h clock. */
export function isRevocable(passport: Pick<PassportCore, "type" | "status">): boolean {
  return passport.type !== "BREAK_GLASS" && passport.status === "ACTIVE";
}

/** Mirrors the backend's getEmergencySummaryFields() — for LABELING only
 *  (e.g. an "Emergency Summary" badge on break-glass views). Never use this to
 *  filter a payload: break-glass responses arrive complete and render as-is. */
export const EMERGENCY_SUMMARY_FIELDS = {
  notes: "full",
  labs: "full",
  prescriptions: "full",
  uploads: "full",
  allergies: "full",
} as const;