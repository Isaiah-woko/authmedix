import type { Role } from "@/types/session";
import type { BreakGlassReason, DurationPreset, PassportType } from "@/types/passport";
import type { PatientDenyReason } from "@/types/patient";

/* ── One-time login code ──────────────────────────────────────────────
   The OTP lives 5 minutes. The API never returns the expiry timestamp —
   start a client-side 5:00 countdown when login returns codeSent: true. */
export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_LENGTH = 6;

/* Passport type → visual identity (HANDOFF §4).
   Class strings are literal so Tailwind v4's scanner picks them up. */
export const PASSPORT_TYPE_META = {
  STANDARD: {
    label: "Standard",
    durationLabel: "8h / 24h",
    textClass: "text-trust-teal",
    bgClass: "bg-trust-teal",
    softBgClass: "bg-trust-teal-soft",
  },
  REFERRAL: {
    label: "Referral",
    durationLabel: "48h fixed",
    textClass: "text-deep-indigo",
    bgClass: "bg-deep-indigo",
    softBgClass: "bg-deep-indigo-soft",
  },
  BREAK_GLASS: {
    label: "Break-Glass",
    durationLabel: "2h fixed",
    textClass: "text-alert-coral",
    bgClass: "bg-alert-coral",
    softBgClass: "bg-alert-coral-soft",
  },
  PENDING: {
    label: "Pending",
    durationLabel: "awaiting review",
    textClass: "text-amber-watch",
    bgClass: "bg-amber-watch",
    softBgClass: "bg-amber-watch-soft",
  },
} as const;
export type PassportTypeKey = keyof typeof PASSPORT_TYPE_META;

/* Duration presets Admin picks when granting/approving a STANDARD passport.
   REFERRAL is always fixed 48h server-side (duration ignored);
   BREAK_GLASS is always fixed 2h. */
export const DURATION_PRESETS = [
  { value: "8H", label: "8 hours — standard clinical access" },
  { value: "24H", label: "24 hours — extended clinical episode" },
] as const satisfies readonly { value: DurationPreset; label: string }[];


/* Fixed list from the clinical protocol — never free text (HANDOFF §3.8). */
export const BREAK_GLASS_REASONS = [
  { value: "LIFE_THREATENING", label: "Life-threatening emergency" },
  { value: "UNCONSCIOUS_UNRESPONSIVE", label: "Unconscious / unresponsive patient" },
  { value: "MEDICATION_ALLERGY_EMERGENCY", label: "Medication-allergy emergency" },
  { value: "TRAUMA", label: "Trauma" },
  { value: "CRITICAL_DIAGNOSTIC_INFO", label: "Critical diagnostic information required" },
  { value: "OTHER", label: "Other" },
]  as const satisfies readonly { value: BreakGlassReason; label: string }[];

export const RECORD_TYPE_LABELS: Record<string, string> = {
  NOTE: "Note",
  LAB: "Lab result",
  PRESCRIPTION: "Prescription",
  UPLOAD: "Upload",
};
export const RECORD_TYPE_ORDER = ["NOTE", "LAB", "PRESCRIPTION", "UPLOAD"] as const;

/* Server-enforced (HANDOFF §3.5); mirrored client-side ONLY to hide
   tabs/buttons a role can never use. Never a security boundary. */
export const RECORD_AUTHORING_MATRIX: Record<string, readonly string[]> = {
  DOCTOR: ["NOTE", "PRESCRIPTION", "UPLOAD"],
  NURSE: ["NOTE", "UPLOAD"],
  PHARMACIST: ["PRESCRIPTION", "UPLOAD"],
  LAB: ["LAB", "UPLOAD"],
  ADMIN: [],
};

export const ROLES = [
  { value: "DOCTOR", label: "Doctor" },
  { value: "NURSE", label: "Nurse" },
  { value: "PHARMACIST", label: "Pharmacist" },
  { value: "LAB", label: "Lab" },
  { value: "ADMIN", label: "Admin" },
] as const satisfies readonly { value: Role; label: string }[];

/* No-access copy for the record view, keyed by the exact `reason` string
   returned in the 403 from GET /api/patients/:id (HANDOFF §4).
   Expired and revoked are different situations — never reuse the copy. */
export const NO_ACCESS_COPY: Record<PatientDenyReason, { title: string; body: string }> = {
  NO_PASSPORT: {
    title: "Access required",
    body: "You don't currently have access to this patient's record. Request authorization, or use Break-Glass if this is an immediate clinical emergency.",
  },
  PASSPORT_EXPIRED: {
    title: "Access Passport Expired",
    body: "Your authorization to access this patient's record has expired. Request a new authorization to continue.",
  },
  PASSPORT_REVOKED: {
    title: "Access Revoked",
    body: "Your access to this patient's record has been revoked. Request a new authorization to continue.",
  },
};

// export type NoAccessReason = keyof typeof NO_ACCESS_COPY;