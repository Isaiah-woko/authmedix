import { api } from "./client";

export interface ActivePassportRow {
  id: string;
  type: "STANDARD" | "REFERRAL" | "BREAK_GLASS";
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
  patientId: string;
  purpose: string;
  scope: string;
  duration?: "8H" | "24H" | "48H" | "2H";
  expiresAt: string;
  createdAt: string;
  renewalCount: number;
  flagged: boolean;
  userName?: string;
  userHealthId?: string;
  userRole?: string;
  patientName?: string;
  patientCode?: string;
}

export interface GrantPassportPayload {
  type: "STANDARD" | "REFERRAL";
  healthId: string;
  patientId: string;
  purpose: string;
  scope: string;
  duration?: "8H" | "24H";
  otpCode: string;
}

/** Clinical dashboard list: only currently-valid passports, soonest expiry first. */
export function getMyActivePassports() {
  return api.get<ActivePassportRow[]>("/passports/mine");
}

/** Admin revoke list. */
export function getActivePassports() {
  return api.get<ActivePassportRow[]>("/passports?active=true");
}

/** Admin direct grant or referral push. Step-up code required. REFERRAL is fixed 48h server-side. */
export function grantPassport(data: GrantPassportPayload) {
  return api.post<ActivePassportRow>("/passports", data);
}

/** Holder-only self renew. STANDARD and REFERRAL only, never break-glass. */
export function renewPassport(id: string) {
  return api.post<{ success?: boolean; newExpiresAt?: string }>(`/passports/${id}/renew`);
}

/** Admin revokes before expiry. Immediate effect. Never offered for BREAK_GLASS. */
export function revokePassport(id: string, data: { revokeReason: string }) {
  return api.post<ActivePassportRow>(`/passports/${id}/revoke`, data);
}