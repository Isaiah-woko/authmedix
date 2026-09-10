import crypto from "crypto";
import type { Role } from "@prisma/client";

const ROLE_PREFIX: Record<Role, string> = {
  DOCTOR: "DOC",
  NURSE: "NUR",
  PHARMACIST: "PHA",
  LAB: "LAB",
  ADMIN: "ADM",
};

/** e.g. LUTH-DOC-0023 */
export function generateHealthId(hospitalCode: string, role: Role, sequence: number): string {
  return `${hospitalCode.toUpperCase()}-${ROLE_PREFIX[role]}-${String(sequence).padStart(4, "0")}`;
}

/** e.g. LUTH-PT-48291 — random 5 digits; caller must retry on unique collision. */
export function generatePatientCode(hospitalCode: string): string {
  return `${hospitalCode.toUpperCase()}-PT-${crypto.randomInt(10000, 100000)}`;
}

/**
 * Random temp password that satisfies the strength rule
 * (10+ chars, upper, lower, number, symbol).
 * Ambiguous characters (0/O, 1/l) are excluded.
 */
export function generateTempPassword(length = 14): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%^&*()-_=+";
  const all = upper + lower + digits + symbols;

  const pick = (set: string) => set[crypto.randomInt(set.length)];

  // Guarantee one of each required class, fill the rest, then shuffle.
  const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  while (chars.length < length) chars.push(pick(all));

  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}