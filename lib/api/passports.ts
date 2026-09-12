import { api } from "./client";

export interface ActivePassportRow {
  id: string;
  type: "STANDARD" | "REFERRAL" | "BREAK_GLASS";
  status: string;
  purpose: string;
  scope: string;
  duration?: string;
  expiresAt: string;
  renewalCount: number;
  patientId: string;
  patientName: string;
  patientCode: string;
  holderName?: string;
  holderHealthId?: string;
}

interface RawPassport {
  id?: string;
  type?: string;
  status?: string;
  purpose?: string;
  scope?: string;
  duration?: string;
  expiresAt?: string;
  renewalCount?: number;
  patientId?: string;
  patientCode?: string;
  patientName?: string;
  userName?: string;
  userHealthId?: string;
  patient?: { id?: string; code?: string; patientCode?: string; name?: string } | null;
  user?: { name?: string; healthId?: string } | null;
}

function normalizePassport(raw: RawPassport): ActivePassportRow {
  return {
    id: raw.id ?? "",
    type: (raw.type as ActivePassportRow["type"]) ?? "STANDARD",
    status: raw.status ?? "ACTIVE",
    purpose: raw.purpose ?? "",
    scope: raw.scope ?? "",
    duration: raw.duration,
    expiresAt: raw.expiresAt ?? new Date().toISOString(),
    renewalCount: raw.renewalCount ?? 0,
    patientId: raw.patient?.id ?? raw.patientId ?? "",
    patientName: raw.patient?.name ?? raw.patientName ?? "",
    patientCode: raw.patient?.patientCode ?? raw.patient?.code ?? raw.patientCode ?? "",
    holderName: raw.user?.name ?? raw.userName,
    holderHealthId: raw.user?.healthId ?? raw.userHealthId,
  };
}

function asPassportList(data: unknown): RawPassport[] {
  if (Array.isArray(data)) return data as RawPassport[];
  const wrapped = data as { passports?: RawPassport[] } | null;
  return wrapped?.passports ?? [];
}

/** Clinical dashboard list: only currently-valid passports. */
export function getMyActivePassports() {
  return api
    .get<unknown>("/passports/mine")
    .then((data) => asPassportList(data).map(normalizePassport));
}

/** Admin revoke list. */
export function getActivePassports() {
  return api
    .get<unknown>("/passports?active=true")
    .then((data) => asPassportList(data).map(normalizePassport));
}

export interface GrantPassportPayload {
  type: "STANDARD" | "REFERRAL";
  healthId: string;
  patientId: string;
  purpose: string;
  scope: string;
  duration?: "8H" | "24H";
  otpCode: string;
}

/** Admin direct grant or referral push. Step-up code required. REFERRAL fixed 48h server-side. */
export function grantPassport(data: GrantPassportPayload) {
  return api.post<unknown>("/passports", data);
}

/** Holder-only self renew. STANDARD and REFERRAL only. */
export function renewPassport(id: string) {
  return api.post<unknown>(`/passports/${id}/renew`);
}

/** Admin revokes before expiry. Immediate effect. Never for BREAK_GLASS. */
export function revokePassport(id: string, data: { revokeReason: string }) {
  return api.post<unknown>(`/passports/${id}/revoke`, data);
}