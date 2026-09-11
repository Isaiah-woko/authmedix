/** Roles — mirrors the backend Prisma enum. */
export type Role = "DOCTOR" | "NURSE" | "PHARMACIST" | "LAB" | "ADMIN";

export type UserStatus = "ACTIVE" | "SUSPENDED" | "LOCKED";

/** The clinical session user (HANDOFF §1). */
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  healthId: string;
  role: Role;
  hospitalId: string;
  /** Role-based clinical session expiry (Nurse 6h, Doctor/Pharmacist/Lab 8h,
   *  Admin 4h — set server-side, never hardcoded). Drive every "session ends
   *  at…" UI from this — NOT from the envelope's `expires`. */
  sessionExpiresAt: string;
  mustChangePassword: boolean;
}

/** Full envelope from GET /api/auth/session. */
export interface Session {
  user: SessionUser;
  issuedAt: string;
  /** NextAuth's 30-day JWT envelope expiry. IGNORE for clinical expiry. */
  expires: string;
}

export const CLINICAL_ROLES: readonly Role[] = [
  "DOCTOR",
  "NURSE",
  "PHARMACIST",
  "LAB",
];

export function isClinicalRole(role: Role): boolean {
  return role !== "ADMIN";
}