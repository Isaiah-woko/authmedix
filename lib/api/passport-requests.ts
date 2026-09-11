import { api } from "./client";

export interface PassportRequestItem {
  id: string;
  purpose: string;
  scope: string;
  status: "PENDING" | "APPROVED" | "DENIED";
  createdAt: string;
  denialReason?: string;
  userName?: string;
  userHealthId?: string;
  userRole?: string;
  patientName?: string;
  patientCode?: string;
  patientId?: string;
}

export interface RequestPassportPayload {
  patientId: string;
  purpose?: string;
  scope?: string[];
}

interface RawRequest {
  id?: string;
  purpose?: string;
  scope?: string | string[];
  status?: string;
  createdAt?: string;
  denialReason?: string;
  userName?: string;
  userHealthId?: string;
  userRole?: string;
  patientName?: string;
  patientCode?: string;
  patientId?: string;
  requester?: { name?: string; healthId?: string; role?: string } | null;
  user?: { name?: string; healthId?: string; role?: string } | null;
  patient?: { id?: string; name?: string; code?: string; patientCode?: string } | null;
}

function normalizeRequest(raw: RawRequest): PassportRequestItem {
  return {
    id: raw.id ?? "",
    purpose: raw.purpose ?? "",
    scope: Array.isArray(raw.scope) ? raw.scope.join(", ") : raw.scope ?? "",
    status: (raw.status ?? "PENDING") as PassportRequestItem["status"],
    createdAt: raw.createdAt ?? new Date().toISOString(),
    denialReason: raw.denialReason,
    userName: raw.requester?.name ?? raw.user?.name ?? raw.userName,
    userHealthId: raw.requester?.healthId ?? raw.user?.healthId ?? raw.userHealthId,
    userRole: raw.requester?.role ?? raw.user?.role ?? raw.userRole,
    patientName: raw.patient?.name ?? raw.patientName,
    patientCode: raw.patient?.code ?? raw.patient?.patientCode ?? raw.patientCode,
    patientId: raw.patient?.id ?? raw.patientId,
  };
}

function asRequestList(data: unknown): RawRequest[] {
  if (Array.isArray(data)) return data as RawRequest[];
  const wrapped = data as { requests?: RawRequest[]; passportRequests?: RawRequest[] } | null;
  return wrapped?.requests ?? wrapped?.passportRequests ?? [];
}

/** Clinical worker requests access, the fallback path when no passport exists. */
export function requestPassport(data: RequestPassportPayload) {
  return api.post<unknown>("/passport-requests", data);
}

/** Mine by default; Admin passes "pending" for the hospital queue.
 *  The real backend expects the uppercase PENDING filter. */
export function getPassportRequests(status?: "pending") {
  const qs = status ? "?status=PENDING" : "";
  return api
    .get<unknown>(`/passport-requests${qs}`)
    .then((data) => asRequestList(data).map(normalizeRequest));
}

/** Admin approves with a duration preset: 8H default, 24H extended. Step-up code required. */
export function approveRequest(
  id: string,
  data: { duration: "8H" | "24H"; scope?: string; otpCode?: string }
) {
  return api.post<unknown>(`/passport-requests/${id}/approve`, data);
}

/** Admin denies; denialReason is required. */
export function denyRequest(id: string, data: { denialReason: string }) {
  return api.post<unknown>(`/passport-requests/${id}/deny`, data);
}