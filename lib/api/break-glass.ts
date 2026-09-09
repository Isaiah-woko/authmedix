import { api } from "./client";
import type { EmergencyCategory } from "@/types/break-glass";

export interface BreakGlassPayload {
  patientId: string;
  confirmedEmergency: true;
  reasonCategory: EmergencyCategory;
  reasonDetail: string;
}

export interface BreakGlassResponse {
  passportId: string;
  expiresAt: string;
}

/** Self-invoked emergency access. Clinical roles only, never Admin. */
export function invokeBreakGlass(data: BreakGlassPayload) {
  return api.post<BreakGlassResponse>("/break-glass", data);
}