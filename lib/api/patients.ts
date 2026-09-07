import { api } from "./client";
import type { AccessPassport } from "@/types/passport";
import type {
  PatientIdentity,
  PatientRegisterRequest,
  PatientRegisterResponse,
  PatientSummary,
} from "@/types/patient";
import type { ClinicalRecord } from "@/types/record";

/** Identity-only search: name + patient code. Never reveals access status. */
export function searchPatients(query: string) {
  return api.get<PatientIdentity[]>(`/patients?query=${encodeURIComponent(query)}`);
}

/** Shape we expect from GET /api/patients/:id when access is allowed */
export interface PatientRecordView {
  patient: PatientSummary;
  records: ClinicalRecord[];
  passport: AccessPassport;
}

/** On 403, throws ApiClientError with .reason = NO_PASSPORT | PASSPORT_EXPIRED | PASSPORT_REVOKED */
export function getPatient(id: string) {
  return api.get<PatientRecordView>(`/patients/${id}`);
}

/** Admin only: register patient + optional care-team assignment in one call */
export function registerPatient(data: PatientRegisterRequest) {
  return api.post<PatientRegisterResponse>("/patients", data);
}