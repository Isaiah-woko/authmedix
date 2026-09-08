"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login } from "@/lib/api";
import { USE_MOCKS } from "@/lib/flags";
import { MOCK_DEMO_USERS } from "@/lib/mocks/mock-server";
import { storeCodeExpiry } from "@/lib/session";
import { ROUTES } from "@/lib/routes";

export function LoginForm() {
  const router = useRouter();
  const [healthId, setHealthId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await login({
        healthId: healthId.trim(),
        email: email.trim(),
        password,
      });
      const fallback = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      storeCodeExpiry(res.codeExpiresAt ?? fallback);
      router.push(ROUTES.OTP);
    } catch (err) {
      const e = err as { locked?: boolean; message?: string };
      if (e.locked) setLocked(true);
      else setError(e.message ?? "Invalid credentials.");
    } finally {
      setSubmitting(false);
    }
  }

  if (locked) {
    return (
      <Alert tone="error">
        Account locked after repeated failed attempts. Contact your administrator to unlock it.
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {USE_MOCKS && (
        <div className="rounded border border-section-line bg-paper p-3 text-dense text-slate">
          <p className="font-medium text-ink">Dev-only helper (mock mode)</p>
          <ul className="mt-1 list-inside list-disc">
            {MOCK_DEMO_USERS.map((u) => (
              <li key={u.healthId}>
                <span className="identifier">{u.healthId}</span> · {u.email} ·{" "}
                <span className="identifier">{u.password}</span> — {u.note}
              </li>
            ))}
          </ul>
        </div>
      )}
      {error && <Alert tone="error">{error}</Alert>}
      <Input
        label="Health ID"
        name="healthId"
        identifier
        placeholder="LUTH-DOC-0231"
        value={healthId}
        onChange={(e) => setHealthId(e.target.value)}
        required
        autoComplete="username"
      />
      <Input
        label="Email"
        name="email"
        type="email"
        placeholder="you@hospital.dev"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
      />
      <Input
        label="Password"
        name="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete="current-password"
      />
      <Button type="submit" loading={submitting}>
        Continue
      </Button>
    </form>
  );
}