import type { UserRole } from "@/types/auth";
import type { DurationPreset, PassportType } from "@/types/passport";
import type { RecordType } from "@/types/record";

export function formatDuration(duration: DurationPreset | string): string {
  switch (duration) {
    case "8H": return "8 hours";
    case "24H": return "24 hours";
    case "48H": return "48 hours";
    case "2H": return "2 hours";
    default: return String(duration);
  }
}

export function formatPassportType(type: PassportType | string): string {
  switch (type) {
    case "STANDARD": return "Standard";
    case "REFERRAL": return "Referral";
    case "BREAK_GLASS": return "Break-Glass";
    default: return String(type);
  }
}

export function formatRole(role: UserRole | string): string {
  switch (role) {
    case "DOCTOR": return "Doctor";
    case "NURSE": return "Nurse";
    case "PHARMACIST": return "Pharmacist";
    case "LAB": return "Lab";
    case "ADMIN": return "Admin";
    default: return String(role);
  }
}

export function formatRecordType(type: RecordType | string): string {
  switch (type) {
    case "NOTE": return "Note";
    case "LAB": return "Lab result";
    case "PRESCRIPTION": return "Prescription";
    case "UPLOAD": return "Upload";
    default: return String(type);
  }
}

/** "BREAK_GLASS" → "Break Glass" */
export function formatAuditAction(action: string): string {
  return action
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

export function formatOutcome(outcome: string): string {
  switch (outcome) {
    case "SUCCESS": return "Success";
    case "DENIED": return "Denied";
    case "FLAGGED": return "Flagged";
    default: return outcome;
  }
}

export function truncate(text: string, maxLength: number): string {
  return text.length <= maxLength ? text : `${text.slice(0, maxLength)}…`;
}