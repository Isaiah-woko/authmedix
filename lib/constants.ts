import type { UserRole } from "@/types/auth";
import type { EmergencyCategory } from "@/types/break-glass";

/** Fixed clinical-protocol list — never free text */
export const BREAK_GLASS_CATEGORIES: { value: EmergencyCategory; label: string }[] = [
  { value: "LIFE_THREATENING", label: "Life-threatening emergency" },
  { value: "UNCONSCIOUS_UNRESPONSIVE", label: "Unconscious/unresponsive patient" },
  { value: "MEDICATION_ALLERGY_EMERGENCY", label: "Medication-allergy emergency" },
  { value: "TRAUMA", label: "Trauma" },
  { value: "CRITICAL_DIAGNOSTIC_INFO", label: "Critical diagnostic information required" },
  { value: "OTHER", label: "Other" },
];

export const JUSTIFICATION_PLACEHOLDER =
  "Patient is unconscious following suspected poisoning. Immediate access to medication and allergy history is required to guide emergency treatment.";

/** Scope options for request/grant forms */
export const SCOPE_OPTIONS = [
  { value: "NOTES", label: "Notes / history" },
  { value: "LABS", label: "Lab results" },
  { value: "PRESCRIPTIONS", label: "Prescriptions" },
  { value: "UPLOADS", label: "Uploads" },
  { value: "ALLERGIES", label: "Allergies" },
] as const;

export type ScopeValue = (typeof SCOPE_OPTIONS)[number]["value"];

/** Pre-filled (editable) on the Request Access screen, per role */
export const DEFAULT_SCOPE_BY_ROLE: Record<UserRole, ScopeValue[]> = {
  DOCTOR: ["NOTES", "LABS", "PRESCRIPTIONS", "UPLOADS", "ALLERGIES"],
  NURSE: ["NOTES", "LABS", "PRESCRIPTIONS", "UPLOADS", "ALLERGIES"],
  PHARMACIST: ["NOTES", "LABS", "PRESCRIPTIONS", "UPLOADS", "ALLERGIES"],
  LAB: ["LABS"],
  ADMIN: [],
};

export const DEFAULT_PURPOSE_BY_ROLE: Record<UserRole, string> = {
  DOCTOR: "Clinical consultation and treatment",
  NURSE: "Patient care and monitoring",
  PHARMACIST: "Medication review and dispensing",
  LAB: "Laboratory investigation",
  ADMIN: "",
};

/** Fixed presets — never a freeform hour count */
export const DURATION_PRESETS = {
  "8H": { label: "8 hours", hint: "Standard clinical access (default)" },
  "24H": { label: "24 hours", hint: "Extended clinical episode" },
  "48H": { label: "48 hours", hint: "Inter-hospital referral (fixed)" },
  "2H": { label: "2 hours", hint: "Emergency access (fixed)" },
} as const;

/** Approve queue offers only these two; 8H is the default */
export const APPROVAL_DURATION_OPTIONS = ["8H", "24H"] as const;