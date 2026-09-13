"use client";

/**
 * The admin step-up 2FA protocol as one callable (HANDOFF §3.2).
 *
 * Usage (Phase 10/11/12 screens):
 *
 *   const { runWithStepUp } = useStepUp();
 *   const outcome = await runWithStepUp({
 *     actionLabel: "Approve access request",
 *     run: (otpCode) => api.passportRequests.approve(id, { duration, otpCode }),
 *   });
 *   if (outcome.cancelled) return;
 *   if (!outcome.result) { // code couldn't be issued — outcome.setupError }
 *   if (outcome.result.ok) { ... } else { describeApiError(outcome.result) }
 */

import { useContext } from "react";
import { StepUpContext } from "@/providers/step-up-provider";
import { isStepUpFailure, requestStepUpCode } from "@/lib/step-up";
import { describeApiError } from "@/lib/api";
import type { ApiResult } from "@/types";
import { useToast } from "./use-toast";

export interface StepUpOutcome<T> {
  /** True when the admin closed the modal without entering a code. */
  cancelled: boolean;
  /** The sensitive call's result. Null when code issuing itself failed. */
  result: ApiResult<T> | null;
  /** Human copy if the step-up code could not be issued (e.g. rate limit). */
  setupError?: string;
}

const MAX_CODE_ATTEMPTS = 3; // step-up issue is rate-limited 5/15min — stay well inside

export function useStepUp() {
  const context = useContext(StepUpContext);
  if (!context) throw new Error("useStepUp must be used inside <StepUpProvider>");
  // Captured after the guard so the async closure below sees a non-null value.
  const prompt = context.prompt;
  const { toast } = useToast();

  async function runWithStepUp<T>(options: {
    actionLabel: string;
    description?: string;
    run: (otpCode: string) => Promise<ApiResult<T>>;
    maxAttempts?: number;
  }): Promise<StepUpOutcome<T>> {
    const maxAttempts = options.maxAttempts ?? MAX_CODE_ATTEMPTS;
    let lastFailure: ApiResult<T> | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // 1. Fresh single-use code — every sensitive action consumes its own.
      const issued = await requestStepUpCode();
      if (!issued.ok) {
        const setupError = describeApiError(issued);
        toast({ title: "Verification unavailable", description: setupError, tone: "danger" });
        return { cancelled: false, result: null, setupError };
      }

      // 2. Collect the code via the global modal.
       const code = await prompt({
        title: options.actionLabel,
        description: options.description,
      });
      if (code === null) return { cancelled: true, result: null };

      // 3. Run the sensitive call with the code attached.
      const result = await options.run(code);
      if (result.ok || !isStepUpFailure(result)) {
        return { cancelled: false, result };
      }

      // 4. Wrong/expired code → loop with a brand-new code.
      lastFailure = result;
      toast({
        title: "Code not accepted",
        description:
          attempt < maxAttempts
            ? "That code was incorrect or expired. A fresh code has been sent."
            : "Too many incorrect codes. Try the action again.",
        tone: "warning",
      });
    }

    return { cancelled: false, result: lastFailure };
  }

  return { runWithStepUp };
}