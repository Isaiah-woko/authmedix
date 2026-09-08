"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { OtpCodeInput } from "@/components/auth/otp-code-input";
import { resendCode, verifyCode } from "@/lib/api";
import { USE_MOCKS } from "@/lib/flags";
import { MOCK_DEMO_CODE } from "@/lib/mocks/mock-server";
import { formatCountdown } from "@/lib/dates";
import { useCountdown } from "@/hooks/use-countdown";
import { clearCodeExpiry, readCodeExpiry, storeCodeExpiry } from "@/lib/session";
import { ROUTES } from "@/lib/routes";
import { useSession } from "@/providers/session-provider";

export function OtpForm() {
  const router = useRouter();
  const { setSession } = useSession();
  const [code, setCode] = useState("");
  const [codeComplete, setCodeComplete] = useState(false);
  const [codeExpiresAt, setCodeExpiresAt] = useState<string | null>(() => readCodeExpiry());
  const [resendCount, setResendCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  const remaining = useCountdown(codeExpiresAt);
  const expired = remaining?.isExpired === true;
  const almostGone = !expired && (remaining?.totalSeconds ?? 0) <= 60;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await verifyCode({ code });
      if (res.session) {
        setSession(res.session);
        clearCodeExpiry();
        router.replace(
          res.session.user.mustChangePassword ? ROUTES.SET_PASSWORD : ROUTES.DASHBOARD
        );
      }
    } catch (err) {
      const e = err as { locked?: boolean; reason?: string; message?: string };
      if (e.locked) setLocked(true);
      else if (e.reason === "CODE_EXPIRED") setError("Code expired. Send a new one below.");
      else setError(e.message ?? "Wrong code.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError(null);
    try {
      const res = await resendCode();
      const fallback = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const iso = res.codeExpiresAt ?? fallback;
      storeCodeExpiry(iso);
      setCodeExpiresAt(iso);
      setCode("");
      setCodeComplete(false);
      setResendCount((c) => c + 1); // remounts the boxes, clearing them
      setNotice("A new code has been sent to your registered device.");
    } catch (err) {
      const e = err as { message?: string };
      setError(e.message ?? "Could not resend the code.");
    } finally {
      setResending(false);
    }
  }

  if (locked) {
    return (
      <Alert tone="error">
        Account locked after repeated wrong codes. Contact your administrator to unlock it.
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      {error && (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}
      {notice && (
        <div className="mb-4">
          <Alert tone="info">{notice}</Alert>
        </div>
      )}
      {expired && (
        <div className="mb-4">
          <Alert tone="warning">Your code has expired. Send a new one to continue.</Alert>
        </div>
      )}

      <OtpCodeInput
        key={resendCount}
        disabled={submitting || expired}
        onCodeChange={(next, complete) => {
          setCode(next);
          setCodeComplete(complete);
        }}
      />

      <div className="mt-6 flex items-center justify-between">
        <p className="identifier text-body-lg text-slate">
          Expires in{" "}
          <span className={expired ? "text-alert-coral" : almostGone ? "text-amber-watch" : "text-slate"}>
            {codeExpiresAt ? formatCountdown(codeExpiresAt) : "--:--"}
          </span>
        </p>
        <Button type="button" variant="ghost" className="px-0" onClick={handleResend} disabled={resending}>
          {resending ? "Sending…" : "Resend code"}
        </Button>
      </div>

      <Button type="submit" size="lg" className="mt-6 w-full" loading={submitting} disabled={expired || !codeComplete}>
        Verify and sign in
      </Button>

      <button
        type="button"
        onClick={() => router.push(ROUTES.LOGIN)}
        className="mx-auto mt-5 text-body text-slate transition-colors hover:text-deep-indigo"
      >
        ← Back to sign in
      </button>

      {USE_MOCKS && (
        <p className="mt-6 text-center text-dense text-slate/70">
          Mock mode: code {MOCK_DEMO_CODE} (also in browser console)
        </p>
      )}
    </form>
  );
}