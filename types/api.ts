import type { PatientIdentity } from "./patient";

// Base shape for error bodies returned by failing API routes
export interface ApiErrorBody {
  error?: string;
  message?: string;
  /** Access-denied reason, e.g. "NO_PASSPORT" (Frontend Brief shape) */
  reason?: string;
  /** Same meaning, Architecture doc shape. Our client accepts both. */
  denyReason?: string;
  /** True when the account is locked after 5 failed attempts */
  locked?: boolean;
  /** Identity block returned with 403 so no-access screens can show name and code.
   *  Contract gap: confirm with the tech lead that the real backend includes this. */
  patient?: PatientIdentity;
}