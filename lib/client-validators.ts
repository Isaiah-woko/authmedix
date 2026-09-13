/**
 * Frontend-only validation helpers.
 *
 * These are NOT the backend security gate.
 * The real validation still happens in lib/validators.ts on the backend.
 *
 * These helpers are used only for instant UI feedback:
 * - password strength meter
 * - OTP input formatting
 * - break-glass justification feedback
 * - basic email checks
 */

import { PASSWORD_RULES } from "@/types/forms";

export interface PasswordCheck {
  id: string;
  label: string;
  passed: boolean;
}

export interface PasswordStrength {
  checks: PasswordCheck[];
  /** 0–5 rules passed; valid only when score === checks.length. */
  score: number;
  valid: boolean;
}

/**
 * Mirrors the backend password rule:
 * 10+ chars, uppercase, lowercase, number, symbol.
 */
export function checkPasswordStrength(password: string): PasswordStrength {
  const checks = PASSWORD_RULES.map((rule) => ({
    id: rule.id,
    label: rule.label,
    passed: rule.test(password),
  }));

  const score = checks.filter((check) => check.passed).length;

  return {
    checks,
    score,
    valid: score === checks.length,
  };
}

/** Six digits, nothing else — login OTP and admin step-up OTP. */
export function isOtpFormat(code: string): boolean {
  return /^\d{6}$/.test(code);
}

/** Break-glass justification: always required, minimum 10 characters. */
export function isValidReasonDetail(text: string): boolean {
  return text.trim().length >= 10;
}

/** Lightweight email check for UI feedback only. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}