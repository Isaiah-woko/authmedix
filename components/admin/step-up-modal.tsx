"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { stepUp } from "@/lib/api/admin";

/**
 * Admin step-up 2FA gate for sensitive actions.
 * Mount it conditionally so every open starts fresh. Each action consumes its own code.
 */
export function StepUpModal({
  actionLabel,
  onConfirm,
  onClose,
  children,
}: {
  actionLabel: string;
  onConfirm: (otpCode: string) => Promise<void>;
  onClose: () => void;
  children?: ReactNode;
}) {
  const [stage, setStage] = useState<"idle" | "ready">("idle");
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function sendCode() {
    setSending(true);
    setError(null);
    try {
      await stepUp();
      setNotice("Code sent. In development it is printed to the browser console.");
      setStage("ready");
    } catch (err) {
      const e = err as { message?: string };
      setError(e.message ?? "Could not send a verification code.");
    } finally {
      setSending(false);
    }
  }

  async function handleConfirm() {
    if (code.length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(code);
      onClose();
    } catch (err) {
      const e = err as { message?: string };
      setError(e.message ?? "Verification failed. Send a new code and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
      <div className="w-full max-w-sm rounded border border-section-line bg-white p-6 shadow-lg">
        <p className="text-section-header font-semibold text-ink">Verification required</p>
        <p className="mt-1 text-body text-slate">
          {actionLabel}. This sensitive action needs a fresh single-use code.
        </p>
        {children}
        {notice && (
          <div className="mt-3">
            <Alert tone="info">{notice}</Alert>
          </div>
        )}
        {error && (
          <div className="mt-3">
            <Alert tone="error">{error}</Alert>
          </div>
        )}
        {stage === "idle" ? (
          <div className="mt-4 flex gap-3">
            <Button onClick={sendCode} loading={sending}>
              Send verification code
            </Button>
            <Button variant="secondary" onClick={onClose} disabled={sending}>
              Cancel
            </Button>
          </div>
        ) : (
          <>
            <div className="mt-4">
              <Input
                label="6-digit code"
                name="otpCode"
                identifier
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <div className="mt-4 flex gap-3">
              <Button onClick={handleConfirm} loading={submitting}>
                Confirm action
              </Button>
              <Button variant="ghost" onClick={sendCode} disabled={sending || submitting}>
                Send new code
              </Button>
              <Button variant="secondary" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}