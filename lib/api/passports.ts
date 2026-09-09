import { api } from "./client";
import type {
  AccessPassport,
  GrantPassportRequest,
  RenewPassportResponse,
  RevokePassportRequest,
} from "@/types/passport";

/** The caller's own active passports, powers the clinical dashboard. */
export function getMyActivePassports() {
  return api.get<AccessPassport[]>("/passports/mine");
}

/** Admin only: STANDARD (8h/24h) or REFERRAL (fixed 48h, duration ignored server-side). */
export function grantPassport(data: GrantPassportRequest) {
  return api.post<AccessPassport>("/passports", data);
}

/** Powers the revoke list on the Grant Passport / Referral screen. */
export function getActivePassports() {
  return api.get<AccessPassport[]>("/passports?active=true");
}

/** Self-renew. STANDARD/REFERRAL only, never wire this for BREAK_GLASS. */
export function renewPassport(id: string) {
  return api.post<RenewPassportResponse>(`/passports/${id}/renew`);
}

/** Admin revokes before expiry, takes effect immediately. */
export function revokePassport(id: string, data: RevokePassportRequest) {
  return api.post<AccessPassport>(`/passports/${id}/revoke`, data);
}