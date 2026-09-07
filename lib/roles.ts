import type { UserRole } from "@/types/auth";
import type { RecordType } from "@/types/record";

export type FieldAccess = "full" | "view-only" | "hidden" | "own-orders";

export interface RoleFieldVisibility {
  notes: FieldAccess;
  labs: FieldAccess;
  prescriptions: FieldAccess;
  uploads: FieldAccess;
  allergies: FieldAccess;
}

/** DISPLAY HINT ONLY — mirrors backend lib/role-fields.ts.
 *  Real filtering happens server-side; we render what we're given. */
export const ROLE_FIELD_VISIBILITY: Record<UserRole, RoleFieldVisibility> = {
  DOCTOR: { notes: "full", labs: "full", prescriptions: "full", uploads: "full", allergies: "full" },
  NURSE: { notes: "full", labs: "full", prescriptions: "view-only", uploads: "view-only", allergies: "full" },
  PHARMACIST: { notes: "view-only", labs: "view-only", prescriptions: "full", uploads: "view-only", allergies: "full" },
  LAB: { notes: "hidden", labs: "own-orders", prescriptions: "hidden", uploads: "hidden", allergies: "hidden" },
  ADMIN: { notes: "hidden", labs: "hidden", prescriptions: "hidden", uploads: "hidden", allergies: "hidden" },
};

/** What each role may author. UI constrains the selector; server rejects mismatches. */
export const ROLE_AUTHORING: Record<UserRole, RecordType[]> = {
  DOCTOR: ["NOTE", "PRESCRIPTION", "UPLOAD"],
  NURSE: ["NOTE", "UPLOAD"],
  PHARMACIST: ["PRESCRIPTION", "UPLOAD"],
  LAB: ["LAB", "UPLOAD"],
  ADMIN: [],
};

export function canAuthorRecordType(role: UserRole, type: RecordType): boolean {
  return ROLE_AUTHORING[role].includes(type);
}

export function isClinicalRole(role: UserRole): boolean {
  return role !== "ADMIN";
}

/** Break-glass: any clinical role, never Admin */
export function canInvokeBreakGlass(role: UserRole): boolean {
  return role !== "ADMIN";
}