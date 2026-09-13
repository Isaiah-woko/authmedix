"use client";

/**
 * Screen 7 — Request Access. The fallback path: most access already exists
 * via care-team assignment before a worker ever needs to ask, and the copy
 * frames it that way. Purpose + scope pre-filled from role, editable.
 * Success: "Request sent — you'll get access once approved." Status checking
 * lives in the Dashboard's pending-requests section (Phase 8).
 *
 * Form events are typed contextually at the JSX boundary — no deprecated
 * event-type imports. Every import below is used.
 */

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { usePatientAccess } from "@/hooks/use-patient-access";
import { usePatientIdentity } from "@/hooks/use-patient-identity";
import { useSession } from "@/hooks/use-session";
import { api, describeApiError } from "@/lib/api";
import { ROLE_REQUEST_DEFAULTS } from "@/lib/role";
import { RECORD_TYPE_LABELS, RECORD_TYPE_ORDER } from "@/lib/constants";
import { zodFieldErrors } from "@/lib/utils";
import { isClinicalRole, requestAccessSchema, type Role } from "@/types";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldError, FieldHint, Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

export default function RequestAccessPage() {
  const params = useParams<{ patientId: string }>();
  const patientId = params?.patientId ?? null;
  const { user, isLoading } = useSession();
  const { state } = usePatientAccess(patientId);
  const identity = usePatientIdentity(patientId);

  if (isLoading || !user || !state) return <Skeleton className="h-64 w-full" />;

  if (!isClinicalRole(user.role)) {
    return (
      <EmptyState
        title="Clinical roles only"
        body="Requesting patient access is available to clinical roles. Admins grant access directly."
        action={
          <Link href="/">
            <Button variant="outline" size="sm">Back to dashboard</Button>
          </Link>
        }
      />
    );
  }

  if (state.status === "allowed") {
    return (
      <EmptyState
        title="You already have access"
        body="Your passport for this patient is active. Open the record view to work."
        action={
          <Link href={`/patients/${patientId}`}>
            <Button variant="primary" size="sm">Open record</Button>
          </Link>
        }
      />
    );
  }

  if (state.status === "not_found" || state.status === "error") {
    return (
      <EmptyState
        title="Couldn't prepare this request"
        body={
          state.status === "not_found"
            ? "This patient doesn't exist or isn't available to your hospital."
            : state.message
        }
        action={
          <Link href="/search">
            <Button variant="outline" size="sm">Back to search</Button>
          </Link>
        }
      />
    );
  }

  // key={user.id}: the form's prefill initializers must run once role is known.
  return (
    <RequestForm
      key={user.id}
      patientId={patientId ?? ""}
      role={user.role}
      patientName={identity?.name ?? null}
    />
  );
}

function RequestForm({
  patientId,
  role,
  patientName,
}: {
  patientId: string;
  role: Role;
  patientName: string | null;
}) {
  const defaults = ROLE_REQUEST_DEFAULTS[role];

  const [purpose, setPurpose] = useState(defaults.purpose);
  const [scope, setScope] = useState<string[]>([...defaults.scope]);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit() {
    setFieldErrors({});
    setFormError(null);

    const parsed = requestAccessSchema.safeParse({ patientId, purpose, scope });
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      return;
    }

    setSubmitting(true);
    const result = await api.passportRequests.create(parsed.data);
    setSubmitting(false);

    if (result.ok) {
      setSent(true);
      return;
    }
    setFormError(describeApiError(result));
  }

  const crumbs = [
    { label: "Dashboard", href: "/" },
    { label: "Search", href: "/search" },
    { label: patientName ?? "Patient", href: `/patients/${patientId}` },
    { label: "Request access" },
  ];

  if (sent) {
    return (
      <>
        <Breadcrumbs items={crumbs} />
        <Card className="max-w-2xl border-l-4 border-l-trust-teal">
          <CardContent className="p-5">
            <p className="text-section font-semibold text-trust-teal">Request sent</p>
            <p className="mt-1 text-body text-slate-ink">
              You&apos;ll get access once an admin approves it. Track it in the pending
              requests section of your dashboard.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Link href="/">
                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                  Back to dashboard
                </Button>
              </Link>
              <Link href={`/patients/${patientId}`}>
                <Button variant="ghost" size="sm" className="w-full sm:w-auto">
                  Back to patient
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <Breadcrumbs items={crumbs} />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Request access{patientName ? ` : ${patientName}` : ""}</CardTitle>
          <CardDescription>
            Most access is assigned at admission via care teams. This request is the
            fallback for when you need a patient outside your assigned team. An admin
            reviews every request.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void onSubmit();
            }}
            noValidate
            className="space-y-5"
          >
            <div>
              <Label htmlFor="purpose">Purpose</Label>
              <Textarea
                id="purpose"
                rows={2}
                className="mt-1"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                invalid={!!fieldErrors.purpose}
              />
              <FieldHint>Pre-filled from your role. Edit to match the clinical need.</FieldHint>
              <FieldError>{fieldErrors.purpose}</FieldError>
            </div>

            <fieldset>
              <legend className="text-body font-medium text-ink">Scope</legend>
              <p className="mt-0.5 text-data text-slate-ink">
                The record types you&apos;re asking to see.
              </p>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {RECORD_TYPE_ORDER.map((type) => (
                  <label
                    key={type}
                    className="flex items-center gap-2 rounded-sm border border-line bg-white px-3 py-2"
                  >
                    <Checkbox
                      checked={scope.includes(type)}
                      onChange={(e) =>
                        setScope((prev) =>
                          e.target.checked ? [...prev, type] : prev.filter((t) => t !== type)
                        )
                      }
                    />
                    <span className="text-body text-ink">{RECORD_TYPE_LABELS[type]}</span>
                  </label>
                ))}
              </div>
              <FieldError>{fieldErrors.scope}</FieldError>
            </fieldset>

            {formError ? (
              <div role="alert">
                <FieldError>{formError}</FieldError>
              </div>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Link href={`/patients/${patientId}`}>
                <Button type="button" variant="ghost" className="w-full sm:w-auto">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" loading={submitting}>
                Send request
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}