import { api } from "./client";
import type { AccessPassport } from "@/types/passport";
import type { PatientIdentity } from "@/types/patient";
import type { ClinicalRecord } from "@/types/record";

/** Flat record-view payload: demographics, role-filtered records, active passport. */
export interface PatientRecordView {
  patient: PatientIdentity & { dob?: string; allergies?: string[] };
  records: ClinicalRecord[];
  passport: AccessPassport;
}

export interface PatientRegisterRequest {
  name: string;
  dob: string;
  allergies?: string[];
  careTeam?: string[];
  duration?: "8H" | "24H";
}

/** Identity-only search. Never reveals access status. */
export function searchPatients(query: string) {
  return api.get<PatientIdentity[]>(`/patients?query=${encodeURIComponent(query)}`);
}

/** Resolves the four trust states; 403 carries the exact deny reason. */
export function getPatient(id: string) {
  return api.get<PatientRecordView>(`/patients/${id}`);
}

/** Admin registers a patient; care team members receive initial STANDARD passports. */
export function registerPatient(data: PatientRegisterRequest) {
  return api.post<{ id: string; patientCode: string; grantedTo?: string[] }>("/patients", data);
}