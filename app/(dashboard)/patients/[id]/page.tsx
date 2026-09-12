"use client";

/**
 * Screen 6 — Patient Record View. The heart of the product.
 *
 *   allowed        → demographics + role-filtered records (rendered as-is) +
 *                    passport panel with live countdown + Renew (omitted for BG)
 *   NO_PASSPORT    → identity + Request Access + Break Glass (Slate state)
 *   PASSPORT_EXPIRED → exact protocol copy (Amber state)
 *   PASSPORT_REVOKED → distinct copy (Coral state)
 *   not_found / error → calm, deliberate states
 *
 * Break-glass overrides everything: Coral banner + fixed Emergency Summary,
 * no role filtering on top (HANDOFF §3.8).
 * React Compiler safe: the only effect awaits before any setState.
 */

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { usePatientAccess } from "@/hooks/use-patient-access";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { api, describeApiError } from "@/lib/api";
import { authorableTypes } from "@/lib/role";
import { formatDate } from "@/lib/utils";
import type { PatientSearchResult } from "@/types";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { AccessStateBanner } from "@/components/domain/access-state-banner";
import { BreakGlassBanner } from "@/components/domain/break-glass-banner";
import { PassportDetailPanel } from "@/components/domain/passport-detail-panel";
import { RecordCard } from "@/components/domain/record-card";

export default function PatientRecordPage() {
  const params = useParams<{ id: string }>();
  const patientId = params?.id ?? null;

  const { user } = useSession();
  const { state, isLoading, refetch } = usePatientAccess(patientId);
  const { toast } = useToast();

  const [identity, setIdentity] = useState<PatientSearchResult | null>(null);
  const [renewing, setRenewing] = useState(false);

  const stateStatus = state?.status ?? null;

  // Identity for the no-access banner. The 403 body carries only { reason },
  // but name/code are NOT access-gated (search is identity-only for any
  // session), so resolving them here leaks nothing clinical (HANDOFF §2).
  useEffect(() => {
    if (!patientId || stateStatus !== "denied") return;
    let active = true;

    async function load() {
      const result = await api.patients.search(); // await FIRST
      if (!active) return;
      setIdentity(
        result.ok ? (result.data.find((p) => p.id === patientId) ?? null) : null
      );
    }

    void load();
    return () => {
      active = false;
    };
  }, [patientId, stateStatus]);

  const handleRenew = useCallback(async () => {
    if (!state || state.status !== "allowed" || !state.data.passport) return;
    setRenewing(true);
    const result = await api.passports.renew(state.data.passport.id);
    setRenewing(false);
    if (result.ok) {
      toast({
        title: "Passport renewed",
        description: "The expiry countdown has been extended.",
        tone: "success",
      });
      await refetch();
    } else {
      toast({ title: "Renewal failed", description: describeApiError(result), tone: "danger" });
    }
  }, [state, refetch, toast]);

  if (isLoading || !state) return <RecordSkeleton />;

  /* ── Denied: the three deliberate no-access states ── */
  if (state.status === "denied") {
    return (
      <>
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/" },
            { label: "Search", href: "/search" },
            { label: "Patient" },
          ]}
        />
        <AccessStateBanner reason={state.reason} identity={identity} patientId={patientId ?? ""} />
      </>
    );
  }

  /* ── Not found / error: calm, distinct ── */
  if (state.status === "not_found") {
    return (
      <EmptyState
        title="Patient not found"
        body="This patient record doesn't exist or is not available to your hospital."
        action={
          <Link href="/search">
            <Button variant="outline" size="sm">Back to search</Button>
          </Link>
        }
      />
    );
  }
  if (state.status === "error") {
    return (
      <EmptyState
        title="Couldn't load this record"
        body={state.message}
        action={
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Try again
          </Button>
        }
      />
    );
  }

  /* ── Allowed: the with-access view ── */
  const patient = state.data;
  const passport = patient.passport ?? null;
  const isBreakGlass = passport?.type === "BREAK_GLASS";
  const canAuthor = user !== null && authorableTypes(user.role).length > 0;
  const hasAllergies = "allergies" in patient;

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Search", href: "/search" },
          { label: patient.name },
        ]}
      />

      {/* Header: identity + primary action */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-title font-semibold text-ink">{patient.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="mono text-data text-slate-ink">{patient.patientCode}</span>
            <span className="text-data text-slate-ink">DOB {formatDate(patient.dob)}</span>
          </div>
        </div>
        {canAuthor ? (
          <Link href={`/add-documentation/${patient.id}`} className="shrink-0">
            <Button variant="primary" size="sm">Add documentation</Button>
          </Link>
        ) : null}
      </div>

      {/* Allergies — omitted entirely for roles that may not see them;
          check key presence, never length (HANDOFF §3.4). Coral = clinical alert. */}
      {hasAllergies ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-data font-medium text-slate-ink">Allergies</span>
          {patient.allergies && patient.allergies.length > 0 ? (
            patient.allergies.map((allergy) => (
              <Badge key={allergy} tone="coral">{allergy}</Badge>
            ))
          ) : (
            <span className="text-data text-slate-ink">None recorded</span>
          )}
        </div>
      ) : null}

      {/* Break-glass: impossible-to-miss Coral banner with live 2h countdown */}
      {isBreakGlass && passport ? (
        <div className="mb-4">
          <BreakGlassBanner expiresAt={passport.expiresAt} />
        </div>
      ) : null}

      {/* Records + passport panel — stacks on mobile, side rail on lg+ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-label="Records">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-section font-semibold text-ink">Records</h2>
            {isBreakGlass ? (
              <Badge tone="coral">Emergency Summary — full scope</Badge>
            ) : (
              <span className="text-data text-slate-ink">
                {patient.records.length} shown for your role
              </span>
            )}
          </div>

          {patient.records.length === 0 ? (
            <EmptyState
              title="No records yet"
              body="Nothing has been documented for this patient within your access scope."
            />
          ) : (
            <div className="space-y-3">
              {patient.records.map((record) => (
                <RecordCard key={record.id} record={record} />
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          {passport ? (
            <PassportDetailPanel
              passport={passport}
              onRenew={() => void handleRenew()}
              renewLoading={renewing}
            />
          ) : null}
        </aside>
      </div>
    </>
  );
}

function RecordSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-56" />
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-52 w-full" />
      </div>
    </div>
  );
}