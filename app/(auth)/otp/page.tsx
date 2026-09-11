"use client";

/**
 * Screen 2 — OTP verification. Live 5:00 countdown from login's codeSent
 * (the API returns no expiry), resend = login again with the same credentials,
 * auto-submit on six digits. On success: mustChangePassword decides the route,
 * and refresh() updates the persistent SessionProvider before navigating.
 *
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { OtpInput } from "@/components/domain/otp-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError, FieldHint } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useOtpCountdown } from "@/hooks/use-countdown";
import { useSession } from "@/hooks/use-session";
import { api, describeApiError } from "@/lib/api";
import {
  clearPendingLogin,
  getPendingLogin,
  updatePendingLoginSentAt,
  type PendingLogin,
} from "@/lib/pending-login";
import { cn } from "@/lib/utils";
import { isLockedBody } from "@/types";

export default function OtpPage() {
  const router = useRouter();
  const { refresh } = useSession();

  const [pending, setPending] = useState<PendingLogin | null>(null);
  const [ready, setReady] = useState(false);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendNote, setResendNote] = useState<string | null>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    let active = true;

    async function init() {
      const stored = getPendingLogin();
      // Yield one microtask before any setState — the React Compiler forbids
      // setState running in an effect's synchronous frame.
      await null;
      if (!active) return;
      if (!stored) {
        router.replace("/login");
        return;
      }
      setPending(stored);
      setReady(true);
    }

    void init();
    return () => {
      active = false;
    };
  }, [router]);

  const countdown = useOtpCountdown(pending?.sentAt ?? null);
  const urgent = !countdown.expired && countdown.msLeft <= 60_000;

  const verify = useCallback(
    async (value: string) => {
      if (!pending || submittingRef.current) return;
      submittingRef.current = true;
      setSubmitting(true);
      setFormError(null);

      const result = await api.auth.verifyCode({ healthId: pending.healthId, code: value });

      setSubmitting(false);
      submittingRef.current = false;

      if (result.ok) {
        clearPendingLogin();
        await refresh(); // SessionProvider persists across navigation — update it
        router.replace(result.data.mustChangePassword ? "/set-password" : "/");
        return;
      }
      if (isLockedBody(result.body)) {
        setLocked(true);
        return;
      }
      setCode("");
      setFormError(describeApiError(result));
    },
    [pending, refresh, router]
  );

  // Auto-submit from the change handler (event context): six digits in,
  // code not expired → verify immediately. Keeps effects setState-free.
  function handleCodeChange(next: string) {
    setCode(next);
    if (next.length === 6 && ready && !countdown.expired && !submittingRef.current) {
      void verify(next);
    }
  }

  async function resend() {
    if (!pending) return;
    setResending(true);
    setResendNote(null);
    setFormError(null);

    const result = await api.auth.login({
      healthId: pending.healthId,
      email: pending.email,
      password: pending.password,
    });

    setResending(false);
    if (result.ok) {
      const sentAt = Date.now();
      updatePendingLoginSentAt(sentAt);
      setPending({ ...pending, sentAt });
      setCode("");
      setResendNote("A new code is on its way.");
      return;
    }
    if (isLockedBody(result.body)) {
      setLocked(true);
      return;
    }
    setFormError(describeApiError(result));
  }

  if (!ready) {
    return (
      <Card>
        <CardContent className="space-y-4 py-8">
          <Skeleton className="mx-auto h-6 w-40" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (locked) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-section font-semibold text-alert-coral">Account locked</p>
          <p className="mt-2 text-body text-slate-ink">
            This account is locked after too many failed attempts. Contact your admin to
            unlock it.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <p className="text-section-lg font-semibold text-deep-indigo">MediTrust</p>
        <CardTitle className="mt-2">Enter your one-time code</CardTitle>
        <CardDescription>
          We sent a 6-digit code to your registered email.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between text-data">
          <span className="text-slate-ink">Code expires in</span>
          <span
            className={cn(
              "mono",
              countdown.expired
                ? "text-alert-coral"
                : urgent
                  ? "text-amber-watch"
                  : "text-trust-teal"
            )}
          >
            {countdown.label}
          </span>
        </div>

        <OtpInput
          value={code}
          onChange={handleCodeChange}
          disabled={submitting || countdown.expired}
          invalid={!!formError}
        />

        {countdown.expired ? (
          <div role="alert">
            <FieldError>That code has expired. Resend a new one to continue.</FieldError>
          </div>
        ) : null}

        {formError ? (
          <div role="alert">
            <FieldError>{formError}</FieldError>
          </div>
        ) : null}

        {resendNote ? <FieldHint>{resendNote}</FieldHint> : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => router.push("/login")}
            disabled={submitting}
          >
            Back to sign in
          </Button>
          <Button variant="outline" onClick={() => void resend()} loading={resending}>
            Resend code
          </Button>
        </div>

        {process.env.NODE_ENV === "development" ? (
          <FieldHint>
            Development: the code prints in the pnpm dev server console.
          </FieldHint>
        ) : null}
      </CardContent>
    </Card>
  );
}