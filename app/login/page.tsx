"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login } from "@/lib/api/auth";

export default function LoginPage() {
  const router = useRouter();
  const [healthId, setHealthId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login({ healthId: healthId.trim(), email: email.trim(), password });
      sessionStorage.setItem(
        "meditrust.pendingLogin",
        JSON.stringify({
          healthId: healthId.trim(),
          email: email.trim(),
          issuedAt: Date.now(),
        })
      );
      router.replace("/otp");
    } catch (err) {
      const e = err as { message?: string };
      setError(e.message ?? "Could not sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4">
      <section className="w-full max-w-md rounded border border-section-line bg-white p-8">
        <p className="text-page-title font-semibold text-deep-indigo">MediTrust</p>
        <p className="mt-1 text-body text-slate">
          Zero-trust clinical records. Sign in with your Health ID and work email.
        </p>
        {error && (
          <div className="mt-4">
            <Alert tone="error">{error}</Alert>
          </div>
        )}
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <Input
            label="Health ID"
            name="healthId"
            identifier
            placeholder="LUTH-DOC-0001"
            value={healthId}
            onChange={(e) => setHealthId(e.target.value)}
            required
          />
          <Input
            label="Work email"
            name="email"
            type="email"
            placeholder="you@hospital.gov.ng"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" loading={submitting}>
            Continue
          </Button>
        </form>
      </section>
    </main>
  );
}