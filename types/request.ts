import type { Role } from "./session";
import type { PassportCore } from "./passport";

export type RequestStatus = "PENDING" | "APPROVED" | "DENIED";

/** GET /api/passport-requests row — same shape for the admin queue
 *  and a clinical worker's own requests. */
export interface PassportRequest {
  id: string;
  purpose: string;
  scope: string[];
  status: RequestStatus;
  createdAt: string;
  denialReason?: string | null;
  requester: { id: string; name: string; role: Role; healthId: string };
  patient: { id: string; name: string; patientCode: string };
}

/** POST /api/passport-requests/:id/approve response. */
export interface ApproveResult {
  passport: PassportCore;
  updatedRequest: PassportRequest;
}

export interface DenyResult {
  ok: boolean;
}