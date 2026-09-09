"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { requestPassport } from "@/lib/api/passport-requests";
import { DEFAULT_PURPOSE_BY_ROLE, DEFAULT_SCOPE_BY_ROLE, SCOPE_OPTIONS } from "@/lib/constants";
import { ROUTES } from "@/lib/routes";
import { useSession } from "@/providers/session-provider";

export default function RequestAccessPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { session } = useSession();
  const patientId = params.id;

  const role = session?.user.role ?? "DOCTOR";
  const [purpose, setPurpose] = useState(DEFAULT_PURPOSE_BY_ROLE[role]);
  const [scope, setScope] = useState<string[]>(DEFAULT_SCOPE_BY_ROLE[role]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleScope(value: string) {
    setScope((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (scope.length === 0) {
      setError("Select at least one scope for this request.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await requestPassport({ patientId, purpose, scope });
      setSuccess(true);
    } catch (err) {
      const e = err as { message?: string };
      setError(e.message ?? "Could not submit request.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <>
        <PageHeader title="Request Access" subtitle="Your request has been sent to the administrator." />
        <section className="max-w-lg rounded border border-trust-teal/40 bg-trust-teal/10 p-6">
          <p className="text-body-lg font-medium text-trust-teal">Request sent</p>
          <p className="mt-1 text-body text-slate">
            You will get access once the administrator approves your request. You can check the status in your dashboard.
          </p>
          <Button className="mt-4" onClick={() => router.push(ROUTES.DASHBOARD)}>
            Back to Dashboard
          </Button>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Request Access"
        subtitle="You do not currently hold an active passport for this patient. Submit a request to the administrator."
      />
      <form onSubmit={handleSubmit} className="max-w-lg flex flex-col gap-5">
        {error && <Alert tone="error">{error}</Alert>}
        <Input
          label="Purpose"
          name="purpose"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          required
        />
        <fieldset className="flex flex-col gap-2">
          <legend className="text-body font-medium text-ink mb-2">Scope of access</legend>
          {SCOPE_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-body text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={scope.includes(option.value)}
                onChange={() => toggleScope(option.value)}
                className="h-4 w-4 rounded border-section-line text-deep-indigo focus:ring-deep-indigo"
              />
              {option.label}
            </label>
          ))}
        </fieldset>
        <Button type="submit" loading={submitting} disabled={scope.length === 0}>
          Submit Request
        </Button>
      </form>
    </>
  );
}