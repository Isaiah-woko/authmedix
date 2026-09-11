import { api } from "./client";
import type { PatientIdentity } from "@/types/patient";

export interface NormalizedRecord {
  id: string;
  type: "NOTE" | "LAB" | "PRESCRIPTION" | "UPLOAD";
  content: string;
  createdAt: string;
  authorName?: string;
  authorRole?: string;
}

export interface NormalizedRecordView {
  patientId: string;
  patientCode: string;
  patientName: string;
  dob?: string | null;
  allergies?: string[];
  passportId?: string | null;
  passportType?: "STANDARD" | "REFERRAL" | "BREAK_GLASS" | null;
  passportExpiresAt?: string | null;
  renewalCount: number;
  records: NormalizedRecord[];
}

interface RawRecord {
  id?: string;
  recordId?: string;
  type?: string;
  recordType?: string;
  content?: string;
  createdAt?: string;
  authorName?: string;
  authorRole?: string;
  author?: { name?: string; role?: string } | null;
}

function normalizeRecord(raw: RawRecord): NormalizedRecord {
  return {
    id: raw.recordId ?? raw.id ?? "",
    type: (raw.recordType ?? raw.type ?? "NOTE") as NormalizedRecord["type"],
    content: raw.content ?? "",
    createdAt: raw.createdAt ?? new Date().toISOString(),
    authorName: raw.author?.name ?? raw.authorName,
    authorRole: raw.author?.role ?? raw.authorRole,
  };
}

interface RawView {
  patientId?: string;
  patientCode?: string;
  patientName?: string;
  dob?: string | null;
  allergies?: string[];
  passportId?: string | null;
  passportType?: string | null;
  passportExpiresAt?: string | null;
  renewalCount?: number;
  records?: RawRecord[];
  patient?: { id?: string; patientCode?: string; code?: string; name?: string; dob?: string | null; allergies?: string[] } | null;
  passport?: { id?: string; type?: string; expiresAt?: string; renewalCount?: number } | null;
}

function normalizeView(data: unknown): NormalizedRecordView {
  const d = (data ?? {}) as RawView;
  const patient = d.patient ?? {};
  const passport = d.passport ?? {};
  return {
    patientId: d.patientId ?? patient.id ?? "",
    patientCode: d.patientCode ?? patient.patientCode ?? patient.code ?? "",
    patientName: d.patientName ?? patient.name ?? "",
    dob: d.dob ?? patient.dob ?? null,
    allergies: d.allergies ?? patient.allergies ?? [],
    passportId: d.passportId ?? passport.id ?? null,
    passportType: (d.passportType ?? passport.type ?? null) as NormalizedRecordView["passportType"],
    passportExpiresAt: d.passportExpiresAt ?? passport.expiresAt ?? null,
    renewalCount: d.renewalCount ?? passport.renewalCount ?? 0,
    records: (d.records ?? []).map(normalizeRecord),
  };
}

/** Identity-only search. Never reveals access status. */
export function searchPatients(query: string) {
  return api
    .get<unknown>(`/patients?query=${encodeURIComponent(query)}`)
    .then((data) => {
      const list = Array.isArray(data)
        ? (data as PatientIdentity[])
        : ((data as { patients?: PatientIdentity[] }).patients ?? []);
      return list;
    });
}

/** Resolves the four trust states; 403 carries the exact deny reason. */
export function getPatient(id: string) {
  return api.get<unknown>(`/patients/${id}`).then(normalizeView);
}

export interface RegisterPatientPayload {
  name: string;
  dob: string;
  allergies?: string[];
  careTeam?: string[];
  duration?: "8H" | "24H";
}

/** Admin registers a patient; care team members receive initial STANDARD passports. */
export function registerPatient(data: RegisterPatientPayload) {
  return api.post<{ id: string; patientCode: string; grantedTo?: string[] }>("/patients", data);
}