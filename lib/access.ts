import type { DenyReason } from "@/types/patient";

export type AccessState = "ACTIVE" | DenyReason;

/** The three no-access situations. Expired and revoked must never share copy. */
export type DenyState = DenyReason;

/** Map the API's 403 reason to the UI state that picks copy and actions. */
export function denyReasonToState(reason?: string): DenyState {
  if (reason === "PASSPORT_EXPIRED") return "PASSPORT_EXPIRED";
  if (reason === "PASSPORT_REVOKED") return "PASSPORT_REVOKED";
  return "NO_PASSPORT";
}

/** Exact copy per state. */
export const ACCESS_STATE_COPY: Record<DenyReason, { headline: string; body: string }> = {
  NO_PASSPORT: {
    headline: "No active passport for this patient",
    body: "You do not currently hold access to this patient's record. Request access, or use break-glass if this is an immediate clinical emergency.",
  },
  PASSPORT_EXPIRED: {
    headline: "Access Passport Expired",
    body: "Your authorization to access this patient's record has expired. Request a new authorization to continue.",
  },
  PASSPORT_REVOKED: {
    headline: "Access revoked",
    body: "Your access to this patient's record has been revoked. Request a new authorization to continue.",
  },
};

/** Color tone per state. Teal, amber and coral each keep their single meaning. */
export const ACCESS_STATE_TONE: Record<AccessState, "teal" | "amber" | "coral" | "slate"> = {
  ACTIVE: "teal",
  NO_PASSPORT: "slate",
  PASSPORT_EXPIRED: "amber",
  PASSPORT_REVOKED: "coral",
};

/** All three no-access states offer the same two next actions. */
export const NO_ACCESS_ACTIONS = ["REQUEST_ACCESS", "BREAK_GLASS"] as const;