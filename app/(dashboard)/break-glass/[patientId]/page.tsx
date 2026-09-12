"use client";

/**
 * Screen 9 — Break-Glass Emergency Access. The deliberate friction screen.
 *
 *   Step 1: explicit Yes/No gate — "No" exits the flow with zero API calls
 *   Step 2: fixed clinical protocol category (never free text)
 *   Step 3: justification, ALWAYS required, min 10 chars, every category
 *
 * POST /api/break-glass sends confirmedEmergency: true literally; the "No"
 * path never calls it. Success → 201 { passportId, expiresAt } → redirect to
 * the record view, where the Coral banner + live 2h countdown take over
 * (Phase 9). Every invocation is audit-logged and flagged server-side.
 * Clinical roles only — Admin gets a guard, never the wizard.
 */

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { usePatientAccess } from "@/hooks/use-patient-access";
import { usePatientIdentity } from "@/hooks/use-patient-identity";
import { useSession } from "@/hooks/use-session";
import { api, describeApiError } from "@/lib/api";
import { BREAK_GLASS_REASONS } from "@/lib/constants";
import { isValidReasonDetail } from "@/lib/client-validators";
import { zodFieldErrors } from "@/lib/utils";
import { breakGlassSchema, isClinicalRole, type BreakGlassReason } from "@/types";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldError, FieldHint, Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

type Step = 1 | 2 | 3;

const STEP_TITLES: Record<Step, string> = {
  1: "Confirm the emergency",
  2: "Select the category",
  3: "Justify the invocation",
};

export default function BreakGlassPage() {
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
        body="Break-Glass is a clinical emergency mechanism. Admin accounts cannot invoke it — and every attempt is audited."
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
        title="You already have active access"
        body="Break-Glass is for immediate emergencies without authorization. Your passport for this patient is valid — use the record view."
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
        title="Couldn't prepare Break-Glass"
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

  return (
    <BreakGlassWizard
      patientId={patientId ?? ""}
      patientName={identity?.name ?? "this patient"}
    />
  );
}

function BreakGlassWizard({
  patientId,
  patientName,
}: {
  patientId: string;
  patientName: string;
}) {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [category, setCategory] = useState<BreakGlassReason | "">("");
  const [reasonDetail, setReasonDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const categoryLabel =
    BREAK_GLASS_REASONS.find((reason) => reason.value === category)?.label ?? "";

  async function activate() {
    setFormError(null);

    const parsed = breakGlassSchema.safeParse({
      patientId,
      confirmedEmergency: true,
      reasonCategory: category,
      reasonDetail,
    });
    if (!parsed.success) {
      setFormError(
        zodFieldErrors(parsed.error).reasonDetail ?? "Check the category and justification."
      );
      return;
    }

    setSubmitting(true);
    const result = await api.breakGlass(parsed.data);
    setSubmitting(false);

    if (result.ok) {
      // The record view's Coral banner + live countdown are the confirmation.
      router.push(`/patients/${patientId}`);
      return;
    }
    setFormError(describeApiError(result));
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Search", href: "/search" },
          { label: patientName, href: `/patients/${patientId}` },
          { label: "Break-glass" },
        ]}
      />

      {/* What this is — impossible to misread */}
      <div className="mb-6 flex items-start gap-3 rounded-sm border border-alert-coral/40 border-l-4 border-l-alert-coral bg-alert-coral-soft p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-alert-coral" aria-hidden="true" />
        <div>
          <p className="text-body font-medium text-alert-coral">
            Break-Glass emergency access — {patientName}
          </p>
          <p className="mt-1 text-data text-slate-ink">
            Grants immediate 2-hour access to the full Emergency Summary (all record
            types), bypassing normal authorization. Every invocation is written to the
            audit log under your Health ID and flagged for admin review.
          </p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>{STEP_TITLES[step]}</CardTitle>
            <span className="mono text-data text-slate-ink">Step {step} of 3</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {step === 1 ? (
            <div className="space-y-4">
              <p className="text-body-lg text-ink">
                Is this an immediate clinical emergency requiring {patientName}&apos;s full
                record right now?
              </p>
              <p className="text-data text-slate-ink">
                Answering Yes grants 2-hour emergency access and files a flagged audit
                event. Answering No returns you to the patient — nothing is invoked,
                nothing is logged.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="danger" onClick={() => setStep(2)}>
                  Yes — immediate clinical emergency
                </Button>
                <Button variant="outline" onClick={() => router.push(`/patients/${patientId}`)}>
                  No — go back
                </Button>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="category">Emergency category</Label>
                <Select
                  id="category"
                  className="mt-1"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as BreakGlassReason | "")}
                >
                  <option value="" disabled>
                    Select a category…
                  </option>
                  {BREAK_GLASS_REASONS.map((reason) => (
                    <option key={reason.value} value={reason.value}>
                      {reason.label}
                    </option>
                  ))}
                </Select>
                <FieldHint>Fixed clinical protocol list — free text is not accepted.</FieldHint>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button variant="danger" disabled={category === ""} onClick={() => setStep(3)}>
                  Continue
                </Button>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <div className="rounded-sm border border-line bg-paper-dim p-3">
                <p className="text-data text-slate-ink">
                  Category: <span className="font-medium text-ink">{categoryLabel}</span>
                </p>
                <p className="mt-1 text-data text-slate-ink">
                  Confirmed: immediate clinical emergency · 2-hour access · flagged for
                  admin review
                </p>
              </div>

              <div>
                <Label htmlFor="reasonDetail">Justification</Label>
                <Textarea
                  id="reasonDetail"
                  rows={4}
                  className="mt-1"
                  placeholder="Why is emergency access required for this patient right now?"
                  value={reasonDetail}
                  onChange={(e) => setReasonDetail(e.target.value)}
                  invalid={reasonDetail.length > 0 && !isValidReasonDetail(reasonDetail)}
                />
                <FieldHint>
                  Required for every category — minimum 10 characters. Currently{" "}
                  <span className="mono">{reasonDetail.trim().length}</span>.
                </FieldHint>
              </div>

              {formError ? (
                <div role="alert">
                  <FieldError>{formError}</FieldError>
                </div>
              ) : null}

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                <Button variant="ghost" onClick={() => setStep(2)} disabled={submitting}>
                  Back
                </Button>
                <Button
                  variant="danger"
                  loading={submitting}
                  disabled={!isValidReasonDetail(reasonDetail)}
                  onClick={() => void activate()}
                >
                  Activate emergency access
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
