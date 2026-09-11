/**
 * Role metadata for UI decisions — navigation (Frontend Brief §6), the
 * authoring matrix (HANDOFF §3.5), and Request Access prefill (Screen 7).
 *
 * Everything here decides what to SHOW. Every actual permission check happens
 * server-side in checkAccess(), and payloads arrive pre-filtered — the UI must
 * never add its own filtering on top (HANDOFF §2, §7).
 */

import type { RecordType, Role } from "@/types";
import { RECORD_AUTHORING_MATRIX, ROLES } from "./constants";

export function roleLabel(role: Role): string {
  return ROLES.find((r) => r.value === role)?.label ?? role;
}

/* ── Navigation ─────────────────────────────────────────────────────── */

export interface NavSection {
  label: string;
  href: string;
}

const CLINICAL_NAV: NavSection[] = [
  { label: "Dashboard", href: "/" },
  { label: "Search", href: "/search" },
];

const ADMIN_NAV: NavSection[] = [
  { label: "Dashboard", href: "/" },
  { label: "Requests queue", href: "/admin/requests" },
  { label: "Passports", href: "/admin/passports" },
  { label: "Staff", href: "/admin/staff" },
  { label: "Register patient", href: "/admin/patients/new" },
  { label: "Flagged review", href: "/admin/flagged" },
  { label: "Audit log", href: "/admin/audit" },
];

export const NAV_SECTIONS: Record<Role, NavSection[]> = {
  DOCTOR: CLINICAL_NAV,
  NURSE: CLINICAL_NAV,
  PHARMACIST: CLINICAL_NAV,
  LAB: CLINICAL_NAV,
  ADMIN: ADMIN_NAV,
};

export function navSectionsFor(role: Role): NavSection[] {
  return NAV_SECTIONS[role];
}

/* ── Authoring matrix (HANDOFF §3.5) ─────────────────────────────────
   Server-enforced; used only to hide tabs/buttons a role can never use. */

export function authorableTypes(role: Role): readonly string[] {
  return RECORD_AUTHORING_MATRIX[role] ?? [];
}

export function canAuthor(role: Role, type: RecordType): boolean {
  return authorableTypes(role).includes(type);
}

/* ── Request Access prefill (Screen 7) ───────────────────────────────
   Editable defaults per role. The backend also pre-fills when purpose/scope
   are omitted (HANDOFF §3.6), so these are UX sugar, not a contract. */

export const ROLE_REQUEST_DEFAULTS: Record<Role, { purpose: string; scope: string[] }> = {
  DOCTOR: {
    purpose: "Direct clinical care",
    scope: ["NOTE", "LAB", "PRESCRIPTION", "UPLOAD"],
  },
  NURSE: {
    purpose: "Direct clinical care — nursing",
    scope: ["NOTE", "LAB", "PRESCRIPTION", "UPLOAD"],
  },
  PHARMACIST: {
    purpose: "Medication review and dispensing",
    scope: ["NOTE", "LAB", "PRESCRIPTION", "UPLOAD"],
  },
  LAB: {
    purpose: "Laboratory processing and results",
    scope: ["LAB"],
  },
  // Admins never request clinical access — they hold no passports.
  ADMIN: { purpose: "", scope: [] },
};