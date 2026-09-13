"use client";

/**
 * Screen 10 detail — approve (duration preset + editable scope, consumes a
 * fresh step-up code) or deny (mandatory reason, no step-up).
 *
 * Replay-safe: once reviewed, the request leaves the pending list and the
 * approve endpoint 404s — both paths render the same graceful state.
 */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useStepUp } from "@/hooks/use-step-up";
import { useToast } from "@/hooks/use-toast";
import { api, describeApiError } from "@/lib/api";
import { DURATION_PRESETS, RECORD_TYPE_LABELS, RECORD_TYPE_ORDER } from "@/lib/constants";
import { formatTimestamp, zodFieldErrors } from "@/lib/utils";
import {
  approveRequestSchema,
  denyRequestSchema,
  type PassportRequest,
} from "@/types";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldError, FieldHint, Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { PatientCodeDisplay } from "@/components/domain/patient-code-display";
import { RoleBadge } from "@/components/domain/role-badge";
import { ScopeBadges } from "@/components/domain/scope-badges";

/** Form-side validation: everything except otpCode, which the step-up flow supplies. */
const approveFormSchema = approveRequestSchema.omit({ otpCode: true });

export default function RequestDetailPage() {
  const params = useParams<{ id: string }>();
  const requestId = params?.id ?? null;
  const router = useRouter();
  const { toast } = useToast();
  const { runWithStepUp } = useStepUp();

  const [request, setRequest] = useState<PassportRequest | null>(null);
  const [missing, setMissing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [duration, setDuration] = useState<"8H" | "24H">("8H");
  const [scope, setScope] = useState<string[]>([]);
  const [approveError, setApproveError] = useState<string | null>(null);

  const [denialReason, setDenialReason] = useState("");
  const [denying, setDenying] = useState(false);
  const [denyError, setDenyError] = useState<string | null>(null);

  useEffect(() => {
    if (!requestId) return;
    let active = true;

    async function run() {
      const result = await api.passportRequests.list("PENDING"); // await FIRST
      if (!active) return;
      if (result.ok) {
        const found = result.data.find((item) => item.id === requestId) ?? null;
        if (found) {
          setRequest(found);
          setScope([...found.scope]); // prefill editable scope from the request
        } else {
          setMissing(true);
        }
      } else {
        setMissing(true);
      }
      setIsLoading(false);
    }

    void run();
    return () => {
      active = false;
    };
  }, [requestId]);

  async function submitApprove() {
    if (!request) return;
    setApproveError(null);

    const parsed = approveFormSchema.safeParse({ duration, scope });
    if (!parsed.success) {
      setApproveError(zodFieldErrors(parsed.error).scope ?? "Check the duration and scope.");
      return;
    }

    const outcome = await runWithStepUp({
      actionLabel: "Approve access request",
      description: `${request.requester.name} → ${request.patient.name}`,
      run: (otpCode) =>
        api.passportRequests.approve(request.id, { duration, scope, otpCode }),
    });

    if (outcome.cancelled || !outcome.result) return;

    if (outcome.result.ok) {
      toast({
        title: "Request approved",
        description: `Standard passport created. ${duration === "8H" ? "8 hours" : "24 hours"}.`,
        tone: "success",
      });
      router.push("/admin/requests");
      return;
    }
    setApproveError(describeApiError(outcome.result));
  }

  async function submitDeny() {
    if (!request) return;
    setDenyError(null);

    const parsed = denyRequestSchema.safeParse({ denialReason });
    if (!parsed.success) {
      setDenyError(
        zodFieldErrors(parsed.error).denialReason ?? "A denial reason is required."
      );
      return;
    }

    setDenying(true);
    const result = await api.passportRequests.deny(request.id, parsed.data);
    setDenying(false);

    if (result.ok) {
      toast({ title: "Request denied", description: "The reason is recorded for the requester.", tone: "default" });
      router.push("/admin/requests");
      return;
    }
    setDenyError(describeApiError(result));
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (missing || !request) {
    return (
      <EmptyState
        title="Already reviewed"
        body="This request is no longer pending. It was approved or denied, possibly by another admin. Reviews cannot be replayed."
        action={
          <Link href="/admin/requests">
            <Button variant="outline" size="sm">Back to queue</Button>
          </Link>
        }
      />
    );
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Requests queue", href: "/admin/requests" },
          { label: request.requester.name },
        ]}
      />

      {/* ── Request summary ── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Access request</CardTitle>
          <CardDescription>
            Submitted <span className="mono">{formatTimestamp(request.createdAt)}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-data font-medium text-slate-ink">Requester</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-body font-medium text-ink">{request.requester.name}</span>
              <RoleBadge role={request.requester.role} />
            </div>
            <span className="mono text-data text-slate-ink">{request.requester.healthId}</span>
          </div>
          <div>
            <p className="text-data font-medium text-slate-ink">Patient</p>
            <p className="mt-1 text-body font-medium text-ink">{request.patient.name}</p>
            <PatientCodeDisplay code={request.patient.patientCode} />
          </div>
          <div className="sm:col-span-2">
            <p className="text-data font-medium text-slate-ink">Purpose</p>
            <p className="mt-1 text-body text-ink">{request.purpose}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-data font-medium text-slate-ink">Requested scope</p>
            <div className="mt-1">
              <ScopeBadges scope={request.scope} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Approve / Deny ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-body">Approve</CardTitle>
            <CardDescription>
              Creates a STANDARD passport immediately. Consumes a fresh step-up code.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="duration">Duration</Label>
              <Select
                id="duration"
                className="mt-1"
                value={duration}
                onChange={(e) => setDuration(e.target.value as "8H" | "24H")}
              >
                {DURATION_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </Select>
              <FieldHint>8h is the default; 24h for an extended episode of care.</FieldHint>
            </div>

            <fieldset>
              <legend className="text-body font-medium text-ink">Scope</legend>
              <p className="mt-0.5 text-data text-slate-ink">
                Pre-filled from the request. Edit if the approval should be narrower.
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
            </fieldset>

            {approveError ? (
              <div role="alert">
                <FieldError>{approveError}</FieldError>
              </div>
            ) : null}

            <Button variant="trust" className="w-full" onClick={() => void submitApprove()}>
              Approve request
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-body">Deny</CardTitle>
            <CardDescription>
              A reason is mandatory. It is recorded and visible to the requester.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="denialReason">Denial reason</Label>
              <Textarea
                id="denialReason"
                rows={4}
                className="mt-1"
                placeholder="e.g. Purpose doesn't match current care needs for this patient."
                value={denialReason}
                onChange={(e) => setDenialReason(e.target.value)}
                invalid={denialReason.length > 0 && denialReason.trim().length < 1}
              />
              <FieldError>{denyError}</FieldError>
            </div>
            <Button
              variant="danger"
              className="w-full"
              loading={denying}
              disabled={denialReason.trim().length === 0}
              onClick={() => void submitDeny()}
            >
              Deny request
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}