import { api } from "./client";
import type { AuditLogEntry } from "@/types/audit";
import type {
  AddStaffRequest,
  AddStaffResponse,
  StaffMember,
  UpdateStaffRequest,
} from "@/types/staff";

export function getStaff() {
  return api.get<StaffMember[]>("/admin/staff");
}

/** Response carries a display-once temp password — UI must say "copy this now" */
export function addStaff(data: AddStaffRequest) {
  return api.post<AddStaffResponse>("/admin/staff", data);
}

/** SUSPENDED also auto-revokes all of that worker's ACTIVE passports server-side */
export function updateStaffStatus(id: string, data: UpdateStaffRequest) {
  return api.patch<StaffMember>(`/admin/staff/${id}`, data);
}

/** Unreviewed break-glass events → Flagged Review Queue */
export function getFlaggedEvents() {
  return api.get<AuditLogEntry[]>("/admin/audit?flagged=true&reviewed=false");
}

/** NOTE: :id here is the AccessPassport id, not an AuditLog id (per contract) */
export function markEventReviewed(id: string, reviewNote?: string) {
  return api.post<AuditLogEntry>(`/admin/audit/${id}/review`, { reviewNote });
}