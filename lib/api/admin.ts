import { api } from "./client";

export interface StaffRow {
  id: string;
  healthId: string;
  name: string;
  email: string;
  role: "DOCTOR" | "NURSE" | "PHARMACIST" | "LAB" | "ADMIN";
  status: "ACTIVE" | "SUSPENDED";
  mustChangePassword: boolean;
  failedLoginAttempts: number;
  locked: boolean;
  createdAt: string;
}

interface RawStaff {
  id?: string;
  healthId?: string;
  name?: string;
  email?: string;
  role?: string;
  status?: string;
  mustChangePassword?: boolean;
  failedLoginAttempts?: number;
  failedLogins?: number;
  locked?: boolean;
  createdAt?: string;
}

function normalizeStaff(raw: RawStaff): StaffRow {
  return {
    id: raw.id ?? "",
    healthId: raw.healthId ?? "",
    name: raw.name ?? "",
    email: raw.email ?? "",
    role: (raw.role ?? "DOCTOR") as StaffRow["role"],
    status: (raw.status ?? "ACTIVE") as StaffRow["status"],
    mustChangePassword: raw.mustChangePassword ?? false,
    failedLoginAttempts: raw.failedLoginAttempts ?? raw.failedLogins ?? 0,
    locked: raw.locked ?? false,
    createdAt: raw.createdAt ?? new Date().toISOString(),
  };
}

function asStaffList(data: unknown): RawStaff[] {
  if (Array.isArray(data)) return data as RawStaff[];
  const wrapped = data as { staff?: RawStaff[]; users?: RawStaff[] } | null;
  return wrapped?.staff ?? wrapped?.users ?? [];
}

export function getStaff() {
  return api.get<unknown>("/admin/staff").then((d) => asStaffList(d).map(normalizeStaff));
}

export function addStaff(data: {
  name: string;
  email: string;
  role: StaffRow["role"];
  otpCode: string;
}) {
  return api.post<unknown>("/admin/staff", data).then((d) => {
    const raw = (d ?? {}) as RawStaff & { tempPassword?: string };
    return { ...normalizeStaff(raw), tempPassword: raw.tempPassword ?? "" };
  });
}

export function updateStaffStatus(id: string, data: { status: "ACTIVE" | "SUSPENDED" }) {
  return api
    .patch<unknown>(`/admin/staff/${id}`, data)
    .then((d) => normalizeStaff((d ?? {}) as RawStaff));
}

export function forceResetPassword(id: string) {
  return api.post<{ ok?: boolean; healthId?: string }>(`/admin/staff/${id}/force-reset`);
}

export function stepUp() {
  return api.post<{ codeSent: boolean }>("/admin/step-up");
}

export interface FlaggedRow {
  id: string;
  userName?: string;
  userHealthId?: string;
  patientName?: string;
  patientCode?: string;
  reasonCategory?: string;
  reasonDetail?: string;
  timestamp: string;
  highPriority: boolean;
}

interface RawFlagged {
  id?: string;
  userName?: string;
  userHealthId?: string;
  patientName?: string;
  patientCode?: string;
  reasonCategory?: string;
  reasonDetail?: string;
  timestamp?: string;
  createdAt?: string;
  highPriority?: boolean;
  user?: { name?: string; healthId?: string } | null;
  patient?: { name?: string; code?: string; patientCode?: string } | null;
}

function normalizeFlagged(raw: RawFlagged): FlaggedRow {
  return {
    id: raw.id ?? "",
    userName: raw.user?.name ?? raw.userName,
    userHealthId: raw.user?.healthId ?? raw.userHealthId,
    patientName: raw.patient?.name ?? raw.patientName,
    patientCode: raw.patient?.code ?? raw.patient?.patientCode ?? raw.patientCode,
    reasonCategory: raw.reasonCategory,
    reasonDetail: raw.reasonDetail,
    timestamp: raw.timestamp ?? raw.createdAt ?? new Date().toISOString(),
    highPriority: raw.highPriority === true,
  };
}

function asFlaggedList(data: unknown): RawFlagged[] {
  if (Array.isArray(data)) return data as RawFlagged[];
  const wrapped = data as { events?: RawFlagged[]; flagged?: RawFlagged[] } | null;
  return wrapped?.events ?? wrapped?.flagged ?? [];
}

/** Unreviewed break-glass events, high-priority first. */
export function getFlaggedEvents() {
  return api
    .get<unknown>("/admin/audit?flagged=true&reviewed=false")
    .then((d) =>
      asFlaggedList(d)
        .map(normalizeFlagged)
        .sort((a, b) => (a.highPriority === b.highPriority ? 0 : a.highPriority ? -1 : 1))
    );
}

export function markEventReviewed(id: string, data: { reviewNote?: string }) {
  return api.post<unknown>(`/admin/audit/${id}/review`, data);
}

export interface AuditLogRow {
  id: string;
  action: string;
  outcome: "ALLOWED" | "DENIED";
  reason?: string;
  flagged: boolean;
  createdAt: string;
  userName?: string;
  userHealthId?: string;
  patientName?: string;
  patientCode?: string;
}

interface RawAudit {
  id?: string;
  action?: string;
  outcome?: string;
  reason?: string;
  flagged?: boolean;
  createdAt?: string;
  timestamp?: string;
  userName?: string;
  userHealthId?: string;
  patientName?: string;
  patientCode?: string;
  user?: { name?: string; healthId?: string } | null;
  patient?: { name?: string; code?: string; patientCode?: string } | null;
}

function normalizeAudit(raw: RawAudit): AuditLogRow {
  return {
    id: raw.id ?? "",
    action: raw.action ?? "UNKNOWN",
    outcome: (raw.outcome ?? "ALLOWED") as AuditLogRow["outcome"],
    reason: raw.reason,
    flagged: raw.flagged === true,
    createdAt: raw.createdAt ?? raw.timestamp ?? new Date().toISOString(),
    userName: raw.user?.name ?? raw.userName,
    userHealthId: raw.user?.healthId ?? raw.userHealthId,
    patientName: raw.patient?.name ?? raw.patientName,
    patientCode: raw.patient?.code ?? raw.patient?.patientCode ?? raw.patientCode,
  };
}

export function getAuditLog() {
  return api.get<unknown>("/audit").then((d) => {
    const wrapped = d as { logs?: RawAudit[] } | null;
    const list = Array.isArray(d) ? (d as RawAudit[]) : wrapped?.logs ?? [];
    return list.map(normalizeAudit);
  });
}