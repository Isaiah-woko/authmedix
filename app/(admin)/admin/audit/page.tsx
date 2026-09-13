"use client";

/**
 * Screen 15 — Audit Log Viewer (Admin).
 * Filterable (user / patient / action / outcome / date range) and paginated
 * via limit+offset. Hospital-scoped server-side — no hospital filter here.
 * Loading is DERIVED (loadedFor vs current filter key), so the fetch effect
 * never sets state synchronously.
 */

import { useEffect, useState } from "react";
import { api, describeApiError } from "@/lib/api";
import { AUDIT_ACTIONS } from "@/types";
import type { AuditLogRow, PatientSearchResult, StaffMember } from "@/types";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AuditRow } from "@/components/domain/audit-row";

const LIMIT = 50;

export default function AuditLogPage() {
  const [userId, setUserId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [action, setAction] = useState("");
  const [outcome, setOutcome] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [offset, setOffset] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [patients, setPatients] = useState<PatientSearchResult[]>([]);

  const filterKey = JSON.stringify({
    userId,
    patientId,
    action,
    outcome,
    startDate,
    endDate,
    offset,
    reloadKey,
  });
  const loading = loadedFor !== filterKey;

  useEffect(() => {
    let active = true;

    async function run() {
      const result = await api.audit.query({
        userId: userId || undefined,
        patientId: patientId || undefined,
        action: action || undefined,
        outcome: (outcome || undefined) as "ALLOWED" | "DENIED" | undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        limit: LIMIT,
        offset,
      });
      if (!active) return;
      if (result.ok) {
        setLogs(result.data.logs);
        setTotal(result.data.total);
        setError(null);
      } else {
        setError(describeApiError(result));
      }
      setLoadedFor(filterKey);
    }

    void run();
    return () => {
      active = false;
    };
    // filterKey encodes every input above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  useEffect(() => {
    let active = true;

    async function run() {
      const result = await api.admin.staff.list();
      if (!active) return;
      if (result.ok) setStaff(result.data);
    }

    void run();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function run() {
      const result = await api.patients.search();
      if (!active) return;
      if (result.ok) setPatients(result.data);
    }

    void run();
    return () => {
      active = false;
    };
  }, []);

  const anyFilter = !!(userId || patientId || action || outcome || startDate || endDate);

  function clearFilters() {
    setUserId("");
    setPatientId("");
    setAction("");
    setOutcome("");
    setStartDate("");
    setEndDate("");
    setOffset(0);
  }

  function applyFilter(value: string, setter: (value: string) => void) {
    setter(value);
    setOffset(0);
  }

  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + LIMIT, total);

  return (
    <>
      <PageHeader
        title="Audit log"
        subtitle="Every access attempt and admin action, allowed and denied. Hospital-scoped server-side."
      />

      {/* ── Filter bar ── */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div>
          <Label htmlFor="filterUser">User</Label>
          <Select
            id="filterUser"
            className="mt-1"
            value={userId}
            onChange={(e) => applyFilter(e.target.value, setUserId)}
          >
            <option value="">All users</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="filterPatient">Patient</Label>
          <Select
            id="filterPatient"
            className="mt-1"
            value={patientId}
            onChange={(e) => applyFilter(e.target.value, setPatientId)}
          >
            <option value="">All patients</option>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.name} ({patient.patientCode})
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="filterAction">Action</Label>
          <Select
            id="filterAction"
            className="mt-1"
            value={action}
            onChange={(e) => applyFilter(e.target.value, setAction)}
          >
            <option value="">All actions</option>
            {AUDIT_ACTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="filterOutcome">Outcome</Label>
          <Select
            id="filterOutcome"
            className="mt-1"
            value={outcome}
            onChange={(e) => applyFilter(e.target.value, setOutcome)}
          >
            <option value="">All outcomes</option>
            <option value="ALLOWED">Allowed</option>
            <option value="DENIED">Denied</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="filterStart">From</Label>
          <Input
            id="filterStart"
            type="date"
            className="mt-1"
            value={startDate}
            onChange={(e) => applyFilter(e.target.value, setStartDate)}
          />
        </div>
        <div>
          <Label htmlFor="filterEnd">To</Label>
          <Input
            id="filterEnd"
            type="date"
            className="mt-1"
            value={endDate}
            onChange={(e) => applyFilter(e.target.value, setEndDate)}
          />
        </div>
      </div>

      {anyFilter ? (
        <div className="mb-4 flex justify-end">
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      ) : null}

      {error ? (
        <EmptyState
          title="Couldn't load the audit log"
          body={error}
          action={
            <Button variant="outline" size="sm" onClick={() => setReloadKey((key) => key + 1)}>
              Try again
            </Button>
          }
        />
      ) : loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        anyFilter ? (
          <EmptyState
            title="No events match these filters"
            body="Widen the date range or clear a filter to see more."
            action={
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="No audit events yet"
            body="Actions and access attempts appear here as they happen."
          />
        )
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Who</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <AuditRow key={log.id} log={log} />
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-data text-slate-ink">
              Showing {from}–{to} of {total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={offset === 0}
                onClick={() => setOffset((current) => Math.max(0, current - LIMIT))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={offset + LIMIT >= total}
                onClick={() => setOffset((current) => current + LIMIT)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}