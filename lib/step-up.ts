/**
 * Admin step-up 2FA protocol (HANDOFF §3.2).
 *
 * Sensitive admin endpoints — POST /api/admin/staff, POST /api/passports,
 * POST /api/passport-requests/:id/approve — require a fresh, single-use OTP
 * in the body as `otpCode`. Every sensitive action consumes its own code:
 *
 *   1. POST /api/admin/step-up   → code goes to the admin's email (dev console in dev)
 *   2. Admin types the code
 *   3. The sensitive call includes it as otpCode
 *
 * Wrong/expired code → 403 step_up_verification_failed → start over at 1.
 * The UI (modal + StepUpProvider) lands in Phases 4–5; this is the protocol layer.
 */

import { API_ERROR_CODES, type ApiResult, type StepUpIssued } from "@/types";
import { api } from "./api";

/** Step 1 — ask the backend to issue a fresh step-up code. */
export function requestStepUpCode(): Promise<ApiResult<StepUpIssued>> {
  return api.admin.stepUp();
}

/** True when a sensitive call failed specifically because of its step-up code.
 *  Screens use this to re-open the step-up modal instead of showing a generic error. */
export function isStepUpFailure(failure: { status: number; body: unknown }): boolean {
  return (
    failure.status === 403 &&
    !!failure.body &&
    typeof failure.body === "object" &&
    "error" in failure.body &&
    (failure.body as { error: string }).error === API_ERROR_CODES.STEP_UP_VERIFICATION_FAILED
  );
}