import { api } from "./client";

export interface RequestPassportPayload {
  patientId: string;
  purpose?: string;
  scope?: string[];
}

export interface PassportRequestItem {
  id: string;
  purpose: string;
  scope: string;
  status: "PENDING" | "APPROVED" | "DENIED";
  createdAt: string;
  denialReason?: string;
}

/** Clinical worker requests access, the fallback path when no passport exists. */
export function requestPassport(data: RequestPassportPayload) {
  return api.post<PassportRequestItem>("/passport-requests", data);
}

/** Mine by default; Admin passes "pending" for the hospital queue. */
export function getPassportRequests(status?: "pending") {
  const qs = status ? `?status=${status}` : "";
  return api.get<PassportRequestItem[]>(`/passport-requests${qs}`);
}

/** Admin approves with a duration preset: 8H default, 24H extended. */
export function approveRequest(
  id: string,
  data: { duration: "8H" | "24H"; scope?: string; otpCode?: string }
) {
  return api.post<{ passport: unknown; updatedRequest: PassportRequestItem }>(
    `/passport-requests/${id}/approve`,
    data
  );
}

/** Admin denies; denialReason is required. */
export function denyRequest(id: string, data: { denialReason: string }) {
  return api.post<{ ok: boolean }>(`/passport-requests/${id}/deny`, data);
}