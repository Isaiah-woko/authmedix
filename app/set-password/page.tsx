"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setPassword } from "@/lib/api/auth";
import { useSession } from "@/providers/session-provider";

export default function SetPasswordPage() {
  const router = useRouter();
  const { refresh } = useSession();
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (newPassword.length < 10) {
      setError("Use at least 10 characters, with a number and a symbol.");
      return;
    }
    if (newPassword !== confirm) {
      setError("The two passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await setPassword({ newPassword });
      await refresh();
      router.replace("/dashboard");
    } catch (err) {
      const e = err as { message?: string };
      setError(e.message ?? "Could not set the new password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4">
      <section className="w-full max-w-md rounded border border-section-line bg-white p-8">
        <p className="text-page-title font-semibold text-deep-indigo">Set a new password</p>
        <p className="mt-1 text-body text-slate">
          Your administrator requires a fresh password before you can continue. Minimum 10
          characters, with a number and a symbol.
        </p>
        {error && (
          <div className="mt-4">
            <Alert tone="error">{error}</Alert>
          </div>
        )}
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <Input
            label="New password"
            name="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <Input
            label="Confirm new password"
            name="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
          <Button type="submit" loading={submitting}>
            Save and continue
          </Button>
        </form>
      </section>
    </main>
  );
}