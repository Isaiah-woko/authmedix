"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setPassword } from "@/lib/api";
import { checkPasswordStrength, passwordsMatch } from "@/lib/password";
import { ROUTES } from "@/lib/routes";
import { useSession } from "@/providers/session-provider";

export function SetPasswordForm() {
  const router = useRouter();
  const { session, setSession } = useSession();
  const [password, setPasswordValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = checkPasswordStrength(password);
  const match = passwordsMatch(password, confirm);
  const canSubmit = check.isValid && match && !submitting;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await setPassword({ newPassword: password });
      if (session) {
        setSession({ ...session, user: { ...session.user, mustChangePassword: false } });
      }
      router.replace(ROUTES.DASHBOARD);
    } catch (err) {
      const e = err as { message?: string };
      setError(e.message ?? "Could not set the password.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Alert tone="info">
        This is the only screen available until you set a new password. It cannot be skipped.
      </Alert>
      {error && <Alert tone="error">{error}</Alert>}
      <Input
        label="New password"
        name="newPassword"
        type="password"
        value={password}
        onChange={(e) => setPasswordValue(e.target.value)}
        required
        autoComplete="new-password"
      />
      <ul className="flex flex-col gap-1">
        {check.rules.map((rule) => (
          <li
            key={rule.label}
            className={`text-dense ${rule.passed ? "text-trust-teal" : "text-slate"}`}
          >
            {rule.passed ? "✓" : "•"} {rule.label}
          </li>
        ))}
      </ul>
      <Input
        label="Confirm new password"
        name="confirmPassword"
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        required
        autoComplete="new-password"
        error={confirm.length > 0 && !match ? "Passwords do not match." : undefined}
      />
      <Button type="submit" disabled={!canSubmit} loading={submitting}>
        Set password and continue
      </Button>
    </form>
  );
}