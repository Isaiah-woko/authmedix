export type PassportType = "STANDARD" | "REFERRAL" | "BREAK_GLASS";
export type PassportStatus = "ACTIVE" | "EXPIRED" | "REVOKED";
export type DurationPreset = "8H" | "24H" | "48H" | "2H";

export interface AccessPassport {
  id: string;
  type: PassportType;
  status: PassportStatus;
  userId: string;
  patientId: string;
  purpose: string;
  scope: string;
  duration: DurationPreset;
  expiresAt: string;
  createdAt: string;
  grantedById: string | null; // null for break-glass (self-invoked)
  renewalCount: number;
  flagged: boolean;
  reasonCategory?: string; // break-glass only
  reasonDetail?: string; // break-glass only
  // Joined display fields the backend may include in list responses
  userName?: string;
  userHealthId?: string;
  patientName?: string;
  patientCode?: string;
}

export interface GrantPassportRequest {
  type: "STANDARD" | "REFERRAL";
  userId: string;
  patientId: string;
  purpose: string;
  scope: string;
  duration?: "8H" | "24H"; // ignored server-side for REFERRAL (fixed 48h)
}

export interface RevokePassportRequest {
  revokeReason: string;
}

export interface RenewPassportResponse {
  success?: boolean;
  newExpiresAt: string;
}