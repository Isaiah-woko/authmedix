"use client";

/**
 * Admin Patients directory.
 *
 * Admin can see patient identity rows and search patients, similar to the staff
 * roster. This does NOT expose clinical data — GET /api/patients is identity-only
 * by contract: id, name, patientCode.
 *
 * Patient registration lives at /admin/patients/new.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useDebouncedValue } from "@/hooks/use-debounce";
import type { PatientSearchResult } from "@/types";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

function getHospitalPrefix(patientCode: string) {
  return patientCode.split("-")[0] ?? "";
}

async function fetchPatients(query: string): Promise<PatientSearchResult[]> {
  const params = new URLSearchParams();

  if (query.trim()) {
    params.set("query", query.trim());
  }

  const url = params.toString() ? `/api/patients?${params.toString()}` : "/api/patients";

  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Could not load patients.");
  }

  return (await res.json()) as PatientSearchResult[];
}

export default function AdminPatientsPage() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);

  const [patients, setPatients] = useState<PatientSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function run() {
      setError(null);

      try {
        const rows = await fetchPatients(debouncedQuery);
        if (!active) return;

        setPatients(rows);
        setLoadedFor(debouncedQuery);
      } catch {
        if (!active) return;
        setError("Could not load the patient directory.");
        setLoadedFor(debouncedQuery);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void run();

    return () => {
      active = false;
    };
  }, [debouncedQuery, reloadKey]);

  const searching = loadedFor !== debouncedQuery;

  function retry() {
    setIsLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  }

  return (
    <>
      <PageHeader
        title="Patients"
        subtitle="Patient identity directory for your hospital. Admins can search and register patients, but clinical records remain protected by access passports."
        actions={
          <Link href="/admin/patients/new">
            <Button variant="primary" size="sm">
              Register patient
            </Button>
          </Link>
        }
      />

      <div className="mb-4 max-w-sm">
        <Label htmlFor="patientSearch">Search patients</Label>
        <Input
          id="patientSearch"
          type="search"
          className="mt-1"
          placeholder="Search by name or patient code…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {isLoading || searching ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : error ? (
        <EmptyState
          title="Couldn't load patients"
          body={error}
          action={
            <Button variant="outline" size="sm" onClick={retry}>
              Try again
            </Button>
          }
        />
      ) : patients.length === 0 ? (
        query.trim() ? (
          <EmptyState
            title="No patients found"
            body={`No patient matches "${query.trim()}". Try a different name or patient code.`}
          />
        ) : (
          <EmptyState
            title="No patients registered yet"
            body="Register the first patient, then assign their initial care team to grant access passports."
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
              <TableHead>Patient code</TableHead>
              <TableHead>Hospital</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.map((patient) => {
              const prefix = getHospitalPrefix(patient.patientCode);

              return (
                <TableRow key={patient.id}>
                  <TableCell>
                    <span className="font-medium">{patient.name}</span>
                  </TableCell>
                  <TableCell>
                    <span className="mono text-data text-slate-ink">
                      {patient.patientCode}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge tone="slate">{prefix}</Badge>
                  </TableCell>
                  <TableCell>
                    <Link href={`/patients/${patient.id}`}>
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