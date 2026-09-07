export type PassportRequestStatus = "PENDING" | "APPROVED" | "DENIED";

export interface PassportRequest {
  id: string;
  userId: string;
  userName?: string;
  userHealthId?: string;
  patientId: string;
  patientName?: string;
  patientCode?: string;
  purpose: string;
  scope: string;
  status: PassportRequestStatus;
  createdAt: string;
  denialReason?: string;
}

export interface CreatePassportRequest {
  patientId: string;
  purpose: string;
  scope: string;
}

export interface ApproveRequestPayload {
  duration: "8H" | "24H"; // default 8H, editable to 24H
  scope: string;
}

export interface DenyRequestPayload {
  denialReason: string; // required
}