// Base shape for error bodies returned by failing API routes
export interface ApiErrorBody {
  error?: string;
  message?: string;
  /** Access-denied reason, e.g. "NO_PASSPORT" (Frontend Brief shape) */
  reason?: string;
  /** Same meaning, Architecture doc shape — our client accepts both */
  denyReason?: string;
  /** True when the account is locked after 5 failed attempts */
  locked?: boolean;
}