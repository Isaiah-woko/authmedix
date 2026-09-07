import { api } from "./client";
import type { ClinicalRecord, CreateRecordRequest, RecordDetail } from "@/types/record";

export function getRecord(id: string) {
  return api.get<RecordDetail>(`/records/${id}`);
}

/** UI constrains the type selector; the server rejects mismatches anyway */
export function createRecord(data: CreateRecordRequest) {
  return api.post<ClinicalRecord>("/records", data);
}