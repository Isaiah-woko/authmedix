"use client";

/**
 * Security overview (Admin) — SOC-style situational awareness, translated for
 * a non-technical hospital admin. Everything is derived client-side from the
 * existing admin endpoints; no new backend work.
 *
 * Design-system contract: Teal = normal/allowed, Amber = watch/pending,
 * Coral = denied/emergency/flagged — the same meanings used everywhere else,
 * never decoratively. Sentence case, mono for timestamps and Health IDs,
 * thin borders, motion only on refresh. Mobile-first: tiles 2-up, sections
 * stack, feed rows wrap.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import {
  buildInsights,
  computeKpis,
  describeRow,
  fmtHourLabel,
  fmtWhen,
  hourlyBuckets,
  ts,
  type AuditRow,
  type FlaggedEvent,
  type Insight,
  type StaffRow,
} from "@/lib/security-insights";
import { cn } from "@/lib/utils";
import { RoleGate } from "@/components/layout/role-gate";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

const REFRESH_MS = 60_000;

/** Tolerant list fetcher — endpoints may return a bare array or a wrapper. */
async function fetchList(url: string): Promise<{ ok: boolean; rows: unknown[] }> {
  try {
    const res = await fetch(url, { credentials: "include", cache: "no-store" });
    if (!res.ok) return { ok: false, rows: [] };
    const data = await res.json().catch(() => null);
    const rows = Array.isArray(data)
      ? data
      : Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.rows)
          ? data.rows
          : [];
    return { ok: true, rows };
  } catch {
    return { ok: false, rows: [] };
  }
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "coral" | "amber" | "teal";
}) {
  return (
    <div className="rounded-sm border border-line bg-white p-3 sm:p-4">
      <p className="text-data text-slate-ink">{label}</p>
      <p
        className={cn(
          "mono mt-1 text-section-lg font-semibold tabular-nums",
          tone === "coral"
            ? "text-alert-coral"
            : tone === "amber"
              ? "text-amber-watch"
              : tone === "teal"
                ? "text-trust-teal"
                : "text-ink"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function InsightRow({ insight }: { insight: Insight }) {
  return (
    <div
      className={cn(
        "border-l-4 p-4",
        insight.severity === "coral" && "border-l-alert-coral",
        insight.severity === "amber" && "border-l-amber-watch",
        insight.severity === "teal" && "border-l-trust-teal"
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={insight.severity}>
          {insight.severity === "coral"
            ? "Act today"
            : insight.severity === "amber"
              ? "Keep an eye on"
              : "Normal"}
        </Badge>
        <h3 className="text-body font-semibold text-ink">{insight.title}</h3>
      </div>
      <p className="mt-1.5 text-body leading-relaxed text-slate-ink">{insight.detail}</p>
      {insight.href ? (
        <Link href={insight.href} className="mt-2.5 inline-block">
          <Button variant="outline" size="sm">
            {insight.ctaLabel ?? "Open"}
          </Button>
        </Link>
      ) : null}
    </div>
  );
}

function SecurityOverview() {
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [flagged, setFlagged] = useState<FlaggedEvent[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(() => Date.now());

    /**
   * Fetch + commit. Every setState happens AFTER the first await, so nothing
   * runs synchronously inside an effect (keeps the set-state-in-effect rule
   * and the React Compiler quiet).
   */
  const load = useCallback(async () => {
    const [auditRes, flaggedRes, passportsRes, pendingRes, staffRes] = await Promise.all([
      fetchList("/api/audit"),
      fetchList("/api/admin/audit?flagged=true&reviewed=false"),
      fetchList("/api/passports?active=true"),
      fetchList("/api/passport-requests?status=pending"),
      fetchList("/api/admin/staff"),
    ]);

    if (auditRes.ok) {
      setFailed(false);
      setAudit(
        (auditRes.rows as AuditRow[]).slice().sort((a, b) => ts(b.createdAt) - ts(a.createdAt))
      );
      setFlagged(flaggedRes.rows as FlaggedEvent[]);
      setStaff(staffRes.rows as StaffRow[]);
      setPendingCount(pendingRes.rows.length);
      setActiveCount(passportsRes.rows.length);
      setNow(Date.now());
    } else {
      setFailed(true);
    }
    setLoading(false);
  }, []);

  /**
   * Spinner wrapper for user- and timer-triggered reloads. Event handlers and
   * interval callbacks MAY set state synchronously — only effects may not.
   */
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  // Initial load — the effect body's sync path contains zero setState calls
  useEffect(() => {
    // eslint-disable-next-line
    void load();
  }, [load]);

  // Gentle 60s poll — paused while the tab is hidden
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  // Gentle 60s poll — paused while the tab is hidden
   // Gentle 60s poll — paused while the tab is hidden
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        // eslint-disable-next-line
        void refresh();
      }
    }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  const insights = useMemo(
    () => buildInsights({ audit, flagged, staff, pendingCount, now }),
    [audit, flagged, staff, pendingCount, now]
  );
  const kpis = useMemo(
    () =>
      computeKpis({
        audit,
        flaggedCount: flagged.length,
        pendingCount,
        activeCount,
        now,
      }),
    [audit, flagged, pendingCount, activeCount, now]
  );
  const buckets = useMemo(() => hourlyBuckets(audit, now), [audit, now]);
  const feed = useMemo(() => audit.slice(0, 30), [audit]);
  const maxBucket = Math.max(1, ...buckets.map((b) => b.allowed + b.denied));

  return (
    <>
      <PageHeader
        title="Security overview"
        subtitle="What is happening across patient access, and what deserves your attention."
        actions={
          <div className="flex items-center gap-2">
            <span className="mono hidden text-data text-slate-ink sm:inline">
              Updated {fmtWhen(new Date(now).toISOString(), now)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refresh()}
              disabled={refreshing}
            >
              <span className="flex items-center gap-2">
                <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
                Refresh
              </span>
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : failed ? (
        <EmptyState
          title="Couldn't load the security overview"
          body="The audit feed didn't respond. This screen only reads existing admin endpoints. Check your session and try again."
          action={
            <Button variant="outline" size="sm" onClick={() => void load}>
              Try again
            </Button>
          }
        />
      ) : (
        <div className="mt-4 space-y-4">
          {/* KPI tiles */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <StatTile label="Audit events · 24h" value={kpis.events24h} />
            <StatTile
              label="Denied · 24h"
              value={kpis.denied24h}
              tone={kpis.denied24h > 0 ? "coral" : "teal"}
            />
            <StatTile
              label="Emergency accesses · 7d"
              value={kpis.breakGlass7d}
              tone={kpis.breakGlass7d > 0 ? "coral" : undefined}
            />
            <StatTile
              label="Open reviews"
              value={kpis.openReviews}
              tone={kpis.openReviews > 0 ? "coral" : "teal"}
            />
            <StatTile
              label="Pending requests"
              value={kpis.pendingRequests}
              tone={kpis.pendingRequests > 0 ? "amber" : "teal"}
            />
            <StatTile label="Active passports" value={kpis.activePassports} tone="teal" />
          </div>

          {/* Attention + activity */}
          <div className="grid gap-4 lg:grid-cols-5">
            <section className="rounded-sm border border-line bg-white lg:col-span-3">
              <header className="flex items-center justify-between border-b border-line px-4 py-3">
                <h2 className="text-section font-semibold text-ink">Needs your attention</h2>
                <Badge tone="slate">Last 7 days</Badge>
              </header>
              <div className="divide-y divide-line">
                {insights.map((insight) => (
                  <InsightRow key={insight.id} insight={insight} />
                ))}
              </div>
            </section>

            <section className="rounded-sm border border-line bg-white p-4 lg:col-span-2">
              <h2 className="text-section font-semibold text-ink">Activity · last 24 hours</h2>
              <p className="mt-0.5 text-data text-slate-ink">
                Allowed vs denied access events, hour by hour.
              </p>

              <div
                className="mt-4 flex h-32 items-end gap-[3px] border-b border-line"
                role="img"
                aria-label="Access events per hour over the last 24 hours"
              >
                {buckets.map((b) => (
                  <div
                    key={b.hourStart}
                    className="flex h-full flex-1 flex-col justify-end"
                    title={`${fmtHourLabel(b.hourStart)} : ${b.allowed} allowed, ${b.denied} denied`}
                  >
                    {b.denied > 0 ? (
                      <div
                        className="w-full bg-alert-coral"
                        style={{ height: `${Math.max(4, (b.denied / maxBucket) * 100)}%` }}
                      />
                    ) : null}
                    {b.allowed > 0 ? (
                      <div
                        className="w-full bg-trust-teal"
                        style={{ height: `${Math.max(4, (b.allowed / maxBucket) * 100)}%` }}
                      />
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="mono mt-1 flex justify-between text-data text-slate-ink">
                <span>{fmtHourLabel(buckets[0].hourStart)}</span>
                <span>{fmtHourLabel(buckets[8].hourStart)}</span>
                <span>{fmtHourLabel(buckets[16].hourStart)}</span>
                <span>now</span>
              </div>

              <div className="mt-3 flex items-center gap-4 text-data text-slate-ink">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-trust-teal" /> Allowed
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-alert-coral" /> Denied
                </span>
              </div>
            </section>
          </div>

          {/* Recent activity feed */}
          <section className="rounded-sm border border-line bg-white">
            <header className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="text-section font-semibold text-ink">Recent activity</h2>
              <span className="mono text-data text-slate-ink">Latest 30 events</span>
            </header>
            {feed.length === 0 ? (
              <div className="p-6">
                <p className="text-body text-slate-ink">
                  No audit events yet. Every access attempt, allowed or denied will appear
                  here as the system is used.
                </p>
              </div>
            ) : (
              <ol className="divide-y divide-line px-4">
                {feed.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-baseline sm:gap-3"
                  >
                    <span className="mono shrink-0 text-data text-slate-ink sm:w-28">
                      {fmtWhen(row.createdAt, now)}
                    </span>
                    <span className="min-w-0 flex-1 text-body text-ink">{describeRow(row)}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      {row.flagged ? <Badge tone="coral">Flagged</Badge> : null}
                      <span className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            row.outcome === "DENIED" ? "bg-alert-coral" : "bg-trust-teal"
                          )}
                          aria-hidden="true"
                        />
                        <span className="text-data text-slate-ink">
                          {row.outcome === "DENIED" ? "denied" : "allowed"}
                        </span>
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      )}
    </>
  );
}

export default function SecurityOverviewPage() {
  return (
    <RoleGate allow="ADMIN">
      <SecurityOverview />
    </RoleGate>
  );
}