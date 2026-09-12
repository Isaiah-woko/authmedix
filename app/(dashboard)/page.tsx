"use client";

/**
 * Screen 4 — Dashboard.
 *
 * Clinical roles: active passports (empty by default — that's the product),
 * plus a "pending requests" section so workers know if their Request Access
 * is awaiting admin review.
 *
 * Admin: stat counters + links to the two working queues (pending requests,
 * flagged review).
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { api, describeApiError } from "@/lib/api";
import type { AdminStats, MyPassport, PassportRequest } from "@/types";
import { isClinicalRole } from "@/types";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PassportPanel } from "@/components/domain/passport-panel";
import { EmptyPassportsIllustration } from "@/components/domain/empty-illustrations";

export default function DashboardPage() {
  const { user } = useSession();

  if (!user) return null;

  return isClinicalRole(user.role) ? <ClinicalDashboard /> : <AdminDashboard />;
}

/* ═══════════════════════════════════════════════════════════════════════
   CLINICAL DASHBOARD
   ═══════════════════════════════════════════════════════════════════════ */

function ClinicalDashboard() {
  const { toast } = useToast();

  /* ── Passports ── */
  const [passports, setPassports] = useState<MyPassport[]>([]);
  const [passportsLoading, setPassportsLoading] = useState(true);
  const [renewingId, setRenewingId] = useState<string | null>(null);

  /* ── Pending requests ── */
  const [pendingRequests, setPendingRequests] = useState<PassportRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      const result = await api.passports.mine();
      if (!active) return;
      if (result.ok) setPassports(result.data);
      else toast({ title: "Couldn't load passports", description: describeApiError(result), tone: "danger" });
      setPassportsLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [toast]);

  useEffect(() => {
    let active = true;
    async function load() {
      const result = await api.passportRequests.list("PENDING");
      if (!active) return;
      if (result.ok) setPendingRequests(result.data);
      setRequestsLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [toast]);

  const handleRenew = useCallback(
    async (passportId: string) => {
      setRenewingId(passportId);
      const result = await api.passports.renew(passportId);
      setRenewingId(null);
      if (result.ok) {
        toast({ title: "Passport renewed", tone: "success" });
        // Refresh list
        const refreshed = await api.passports.mine();
        if (refreshed.ok) setPassports(refreshed.data);
      } else {
        toast({ title: "Renewal failed", description: describeApiError(result), tone: "danger" });
      }
    },
    [toast]
  );

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Your active patient access passports."
        actions={
          <Link href="/search">
            <Button variant="outline" size="sm">Search patients</Button>
          </Link>
        }
      />

      {/* ── Active passports ── */}
      <section aria-label="Active passports">
        {passportsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : passports.length === 0 ? (
          <EmptyState
            title="No patients currently assigned to you"
            icon={<EmptyPassportsIllustration />}
            body="Use Search to find a patient and request access, or wait for an admin to assign you via care-team."
            action={
              <Link href="/search">
                <Button variant="primary" size="sm">Search patients</Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {passports.map((p) => (
              <PassportPanel
                key={p.id}
                passport={p}
                onRenew={handleRenew}
                renewLoading={renewingId === p.id}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Pending requests ── */}
      <section aria-label="Pending requests" className="mt-8">
        <h2 className="text-section font-semibold text-ink">Pending requests</h2>
        <p className="mt-0.5 text-body text-slate-ink">
          Access requests awaiting admin review.
        </p>
        <div className="mt-3">
          {requestsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : pendingRequests.length === 0 ? (
            <p className="text-body text-slate-ink">No pending requests.</p>
          ) : (
            <div className="space-y-2">
              {pendingRequests.map((r) => (
                <Card key={r.id}>
                  <CardContent className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-body font-medium text-ink">
                        {r.patient.name}
                      </p>
                      <p className="mono text-data text-slate-ink">
                        {r.patient.patientCode}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone="amber">Pending</Badge>
                      <span className="text-data text-slate-ink-soft">
                        {r.purpose}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   ADMIN DASHBOARD
   ═══════════════════════════════════════════════════════════════════════ */

function AdminDashboard() {
  const { toast } = useToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      const result = await api.admin.stats();
      if (!active) return;
      if (result.ok) setStats(result.data);
      else toast({ title: "Couldn't load stats", description: describeApiError(result), tone: "danger" });
      setIsLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [toast]);

  if (isLoading) {
    return (
      <>
        <PageHeader title="Admin Dashboard" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Admin Dashboard"
        subtitle="Hospital overview and working queues."
      />

      {/* ── Stat counters ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Staff accounts" value={stats?.staffCount ?? 0} href="/admin/staff" />
        <StatCard label="Patients" value={stats?.patientCount ?? 0} href="/admin/patients/new" linkLabel="Register new" />
        <StatCard
          label="Pending requests"
          value={stats?.pendingRequests ?? 0}
          href="/admin/requests"
          tone={stats?.pendingRequests ? "amber" : undefined}
        />
        <StatCard
          label="Flagged for review"
          value={stats?.unreviewedFlagged ?? 0}
          href="/admin/flagged"
          tone={stats?.unreviewedFlagged ? "coral" : undefined}
        />
      </div>

      {/* ── Quick links ── */}
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <QuickLink href="/admin/requests" title="Requests queue" description="Approve or deny pending access requests." />
        <QuickLink href="/admin/passports" title="Active passports" description="View and revoke currently active passports." />
        <QuickLink href="/admin/staff" title="Staff management" description="Add, suspend, or unlock staff accounts." />
        <QuickLink
        href="/admin/patients"
        title="Patients"
        description="Directory of registered patients: Open a record state or register a new patient with care team."
        />
        <QuickLink href="/admin/flagged" title="Flagged review" description="Review break-glass events requiring attention." />
        <QuickLink href="/admin/audit" title="Audit log" description="Filterable log of all system activity." />
      </div>
    </>
  );
}

/* ── Sub-components ── */

function StatCard({
  label,
  value,
  href,
  linkLabel,
  tone,
}: {
  label: string;
  value: number;
  href: string;
  linkLabel?: string;
  tone?: "amber" | "coral";
}) {
  const toneClass =
    tone === "amber"
      ? "border-l-amber-watch"
      : tone === "coral"
        ? "border-l-alert-coral"
        : "border-l-line";
  return (
    <Link href={href}>
      <Card className={`border-l-4 ${toneClass} hover:bg-paper-dim/50`}>
        <CardContent className="p-4">
          <p className="text-data font-medium text-slate-ink">{label}</p>
          <p className="mt-1 text-title font-semibold text-ink">{value}</p>
          <p className="mt-1 text-data text-deep-indigo hover:underline">
            {linkLabel ?? "View →"}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

function QuickLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link href={href}>
      <Card className="h-full hover:bg-paper-dim/50">
        <CardContent className="p-4">
          <CardTitle className="text-body">{title}</CardTitle>
          <p className="mt-1 text-data text-slate-ink">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}