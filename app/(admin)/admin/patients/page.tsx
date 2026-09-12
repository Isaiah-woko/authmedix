"use client";

/**
 * Admin patient directory — the "Patients" sidebar section.
 * Identity-only rows from GET /api/patients (empty query = first 50, same as
 * search), scoped to your hospital by default with an explicit toggle for
 * cross-hospital rows. Active-passport counts come from ONE
 * GET /api/passports?active=true call — no per-row requests.
 * Registration (Screen 13) lives at /admin/patients/new; this page is its entry.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useSession } from "@/hooks/use-session";
import { api } from "@/lib/api";
import { hospitalCode } from "@/lib/utils";
import type { PatientSearchResult } from "@/types";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AdminPatientsPage() {
  const { user } = useSession();

  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query.trim(), 300);
  const [rows, setRows] = useState<PatientSearchResult[]>([]);
  const [searchedFor, setSearchedFor] = useState<string | null>(null);
  const [includeOther, setIncludeOther] = useState(false);

  const [activeCounts, setActiveCounts] = useState<Record<string, number> | null>(null);

  const ownCode = user ? hospitalCode(user.healthId) : "";

  useEffect(() => {
    let active = true;

    async function run() {
      const result = await api.patients.search(debounced || undefined); // await FIRST
      if (!active) return;
      if (result.ok) {
        setRows(result.data);
        setSearchedFor(debounced);
      }
    }

    void run();
    return () => {
      active = false;
    };
  }, [debounced]);

  useEffect(() => {
    let active = true;

    async function run() {
      const result = await api.passports.activeList(); // await FIRST
      if (!active) return;
      if (result.ok) {
        const counts: Record<string, number> = {};
        for (const passport of result.data) {
          counts[passport.patient.id] = (counts[passport.patient.id] ?? 0) + 1;
        }
        setActiveCounts(counts);
      } else {
        setActiveCounts({});
      }
    }

    void run();
    return () => {
      active = false;
    };
  }, []);

  const loading = searchedFor !== debounced;
  const visible =
    includeOther || !ownCode
      ? rows
      : rows.filter((row) => hospitalCode(row.patientCode) === ownCode);

  return (
    <>
      <PageHeader
        title="Patients"
        subtitle="Registered patients for your hospital. Open a row to see its access state, or register a new patient with an initial care team."
        actions={
          <Link href="/admin/patients/new">
            <Button variant="primary" size="sm">
              Register patient
            </Button>
          </Link>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:max-w-xs">
          <Label htmlFor="patientFilter">Filter by name or code</Label>
          <Input
            id="patientFilter"
            type="search"
            className="mt-1"
            placeholder="Search patients…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 pb-2">
          <Checkbox
            checked={includeOther}
            onChange={(e) => setIncludeOther(e.target.checked)}
          />
          <span className="text-body text-slate-ink">Include other hospitals</span>
        </label>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : visible.length === 0 ? (
        debounced ? (
          <EmptyState
            title="No patients match"
            body={`Nothing matches "${debounced}"${includeOther ? "" : " in your hospital"}.`}
          />
        ) : (
          <EmptyState
            title="No patients registered yet"
            body="Register the first patient to assign their initial care team — that is how most access gets granted."
            action={
              <Link href="/admin/patients/new">
                <Button variant="primary" size="sm">
                  Register patient
                </Button>
              </Link>
            }
          />
        )
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Hospital</TableHead>
              <TableHead>Active passports</TableHead>
              <TableHead>
                <span className="sr-only">Open</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((row) => {
              const code = hospitalCode(row.patientCode);
              const count = activeCounts ? (activeCounts[row.id] ?? 0) : null;
              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <span className="font-medium">{row.name}</span>
                    <br />
                    <span className="mono text-data text-slate-ink">{row.patientCode}</span>
                  </TableCell>
                  <TableCell>
                    <Badge tone={code === ownCode ? "slate" : "indigo"}>{code}</Badge>
                  </TableCell>
                  <TableCell>
                    {count === null ? (
                      <span className="text-data text-slate-ink-soft">…</span>
                    ) : count > 0 ? (
                      <Badge tone="teal">{count} active</Badge>
                    ) : (
                      <Badge tone="slate">None</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link href={`/patients/${row.id}`}>
                      <Button variant="outline" size="sm">
                        Open
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </>
  );
}