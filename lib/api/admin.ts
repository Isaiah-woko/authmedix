import { api } from "./client";

export interface StaffRow {
  id: string;
  healthId: string;
  name: string;
  email: string;
  role: "DOCTOR" | "NURSE" | "PHARMACIST" | "LAB" | "ADMIN";
  status: "ACTIVE" | "SUSPENDED";
  mustChangePassword: boolean;
  failedLoginAttempts?: number;
  createdAt: string;
}

export interface NewStaffPayload {
  name: string;
  email: string;
  role: StaffRow["role"];
  otpCode: string;
}

export interface NewStaffResult extends StaffRow {
  tempPassword: string;
}

export interface FlaggedRow {
  id: string;
  userId: string;
  userName?: string;
  patientId: string;
  patientName?: string;
  action: string;
  outcome: string;
  flagged: boolean;
  reviewed: boolean;
  timestamp: string;
  reasonCategory?: string;
  reasonDetail?: string;
  highPriority?: boolean;
  reviewedBy?: string;
}

export function getStaff() {
  return api.get<StaffRow[]>("/admin/staff");
}

/** Step-up 2FA: a fresh single-use code for each sensitive action. */
export function stepUp() {
  return api.post<{ codeSent: boolean }>("/admin/step-up");
}

export function addStaff(data: NewStaffPayload) {
  return api.post<NewStaffResult>("/admin/staff", data);
}

export function updateStaffStatus(id: string, data: { status: "ACTIVE" | "SUSPENDED" }) {
  return api.patch<StaffRow>(`/admin/staff/${id}`, data);
}

/** Incident lever: forces a new password and kills live sessions instantly. */
export function forceResetPassword(id: string) {
  return api.post<{ ok: boolean; healthId: string }>(`/admin/staff/${id}/force-reset`);
}

export function getFlaggedEvents() {
  return api.get<FlaggedRow[]>("/admin/audit?flagged=true&reviewed=false");
}

export function markEventReviewed(id: string, data: { reviewNote?: string }) {
  return api.post<FlaggedRow>(`/admin/audit/${id}/review`, data);
}