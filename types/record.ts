export type RecordType = "NOTE" | "LAB" | "PRESCRIPTION" | "UPLOAD";

export interface ClinicalRecord {
  id: string;
  type: RecordType;
  content: string;
  createdAt: string;
  authorName?: string;
  authorRole?: string;
}

export interface RecordDetail extends ClinicalRecord {
  patientId: string;
}

export interface CreateRecordRequest {
  patientId: string; // NOTE: confirm with tech lead — brief shows only {type, content}
  type: RecordType;
  content: string;
}