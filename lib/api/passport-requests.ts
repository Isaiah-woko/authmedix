import { api } from "./client";
import type {
  ApproveRequestPayload,
  CreatePassportRequest,
  DenyRequestPayload,
  PassportRequest,
} from "@/types/passport-request";

/** Clinical worker asks for access (fallback path) */
export function createPassportRequest(data: CreatePassportRequest) {
  return api.post<PassportRequest>("/passport-requests", data);
}

/** "mine" by default; Admin passes status="pending" for the queue */
export function getPassportRequests(status?: "pending") {
  const qs = status ? `?status=${status}` : "";
  return api.get<PassportRequest[]>(`/passport-requests${qs}`);
}

/** Admin approves with duration preset 8H (default) or 24H */
export function approveRequest(id: string, data: ApproveRequestPayload) {
  return api.post<PassportRequest>(`/passport-requests/${id}/approve`, data);
}

/** Admin denies; denialReason is required */
export function denyRequest(id: string, data: DenyRequestPayload) {
  return api.post<PassportRequest>(`/passport-requests/${id}/deny`, data);
}