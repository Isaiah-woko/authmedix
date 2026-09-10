import type { Role, RecordType } from "@prisma/client";

export type FieldAccess = "full" | "view" | "hidden";

export interface RoleFieldVisibility {
  notes: FieldAccess;
  labs: FieldAccess;
  prescriptions: FieldAccess;
  uploads: FieldAccess;
  allergies: FieldAccess;
}

/**
 * Role-to-field visibility map.
 * Applies ONLY to STANDARD / REFERRAL passports.
 * BREAK_GLASS always returns the fixed Emergency Summary (see below).
 */
export const roleFieldMap: Record<Role, RoleFieldVisibility> = {
  DOCTOR:     { notes: "full",   labs: "full",   prescriptions: "full",   uploads: "full",   allergies: "full" },
  NURSE:      { notes: "full",   labs: "full",   prescriptions: "view",   uploads: "view",   allergies: "full" },
  PHARMACIST: { notes: "view",   labs: "view",   prescriptions: "full",   uploads: "view",   allergies: "full" },
  LAB:        { notes: "hidden", labs: "full",   prescriptions: "hidden", uploads: "hidden", allergies: "hidden" },
  ADMIN:      { notes: "hidden", labs: "hidden", prescriptions: "hidden", uploads: "hidden", allergies: "hidden" },
};

/**
 * Role-to-authoring map.
 * Record.type is an explicit choice at entry time, never inferred from content.
 * Enforced server-side in POST /api/records (UI constrains the selector too).
 */
export const roleAuthoringMap: Record<Role, RecordType[]> = {
  DOCTOR:     ["NOTE", "PRESCRIPTION", "UPLOAD"],
  NURSE:      ["NOTE", "UPLOAD"],
  PHARMACIST: ["PRESCRIPTION", "UPLOAD"],
  LAB:        ["LAB", "UPLOAD"],
  ADMIN:      [],
};

export function getVisibleFields(role: Role): RoleFieldVisibility {
  return roleFieldMap[role];
}

/** Break-glass Emergency Summary: full record, unfiltered, same for every role. */
export function getEmergencySummaryFields(): RoleFieldVisibility {
  return { notes: "full", labs: "full", prescriptions: "full", uploads: "full", allergies: "full" };
}

export function canAuthorType(role: Role, type: RecordType): boolean {
  return roleAuthoringMap[role]?.includes(type) ?? false;
}