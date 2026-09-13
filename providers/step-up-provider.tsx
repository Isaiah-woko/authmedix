"use client";

/**
 * Global admin step-up 2FA modal (HANDOFF §3.2).
 *
 * Any sensitive admin action calls useStepUp().runWithStepUp(...), which:
 *   1. POSTs /api/admin/step-up (fresh single-use code → email / dev console)
 *   2. opens this modal via prompt()
 *   3. feeds the entered code into the sensitive call as otpCode
 *   4. on step_up_verification_failed, loops with a fresh code (max 3)
 *
 * The markup is intentionally self-contained (no Phase 5 primitives yet);
 * Phase 12 can polish it without changing the prompt() contract.
 */

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface StepUpPromptOptions {
  /** Short imperative title, e.g. "Approve access request". */
  title: string;
  description?: string;
}

export interface StepUpContextValue {
  /** Resolves with the 6-digit code, or null if the admin cancelled. */
  prompt: (options: StepUpPromptOptions) => Promise<string | null>;
}

export const StepUpContext = createContext<StepUpContextValue | null>(null);

interface StepUpPromptState extends StepUpPromptOptions {
  resolve: (code: string | null) => void;
}

export function StepUpProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StepUpPromptState | null>(null);
  const [code, setCode] = useState("");

  const prompt = useCallback((options: StepUpPromptOptions) => {
    setCode("");
    return new Promise<string | null>((resolve) => {
      setState({ ...options, resolve });
    });
  }, []);

  const close = useCallback((value: string | null) => {
    setState((prev) => {
      prev?.resolve(value);
      return null;
    });
    setCode("");
  }, []);

  const submit = useCallback(() => {
    if (!/^\d{6}$/.test(code)) return;
    close(code);
  }, [code, close]);

  // Escape closes while open.
  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, close]);

  const value = useMemo(() => ({ prompt }), [prompt]);

  return (
    <StepUpContext.Provider value={value}>
      {children}

      {state ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/40" onClick={() => close(null)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={state.title}
            className="relative w-full max-w-sm rounded-md border border-line bg-paper p-6"
          >
            <h2 className="text-section font-semibold text-ink">{state.title}</h2>
            <p className="mt-1 text-body text-slate-ink">
              {state.description ?? "This action requires extra verification."}
            </p>
            <p className="mt-3 text-data text-slate-ink">
              A one-time code was sent to your email. In development it prints to the
              server console. Codes are single-use.
            </p>

            <input
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              inputMode="numeric"
              placeholder="••••••"
              aria-label="One-time verification code"
              className="mono mt-4 w-full rounded-sm border border-line bg-white px-3 py-2 text-center text-lg tracking-[0.5em] text-ink outline-none focus:border-trust-teal"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => close(null)}
                className="rounded-sm border border-line px-4 py-2 text-body text-slate-ink hover:bg-paper-dim"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={!/^\d{6}$/.test(code)}
                className="rounded-sm bg-deep-indigo px-4 py-2 text-body font-medium text-white hover:bg-deep-indigo-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                Verify
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </StepUpContext.Provider>
  );
}