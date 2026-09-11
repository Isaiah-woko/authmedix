import type { Role } from "./session";

export type RecordType = "NOTE" | "LAB" | "PRESCRIPTION" | "UPLOAD";

export interface RecordAuthor {
  id: string;
  name: string;
  role: Role;
}

/** Record row inside GET /api/patients/:id → records[].
 *  Named PatientRecord to avoid clashing with TS's built-in Record utility. */
export interface PatientRecord {
  id: string;
  type: RecordType;
  content: string;
  createdAt: string;
  author: RecordAuthor;
}

/** GET /api/records/:id — record detail. */
export interface RecordDetail {
  id: string;
  patientId: string;
  type: RecordType;
  content: string;
  contentHash: string | null;
  createdAt: string;
  author: RecordAuthor;
}

/** POST /api/records response. */
export interface RecordCreated {
  id: string;
  type: RecordType;
  createdAt: string;
}