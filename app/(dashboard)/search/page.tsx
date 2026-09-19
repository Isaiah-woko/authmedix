"use client";

/**
 * Screen 5 — Patient Search. Identity-only results: name + patientCode +
 * hospitalId. Never shows access status — that resolves only when the
 * patient is opened (Screen 6). Cross-hospital results are expected.
 *
 * Debounced at 300ms. Loading / has-searched are DERIVED during render from
 * `searchedFor` (the query the current results belong to), so the effect
 * contains zero synchronous setState — React Compiler safe.
 */

import { useEffect, useState } from "react";
import { EmptySearchIllustration } from "@/components/domain/empty-illustrations";
import Link from "next/link";
import { Search } from "lucide-react";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useToast } from "@/hooks/use-toast";
import { api, describeApiError } from "@/lib/api";
import type { PatientSearchResult } from "@/types";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PatientIdentityCard } from "@/components/domain/patient-identity-card";

export default function SearchPage() {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim(), 300);

  const [results, setResults] = useState<PatientSearchResult[]>([]);
  /** The query the currently-rendered results belong to. */
  const [searchedFor, setSearchedFor] = useState<string | null>(null);

  useEffect(() => {
    // Idle (empty query) needs no state at all — the render derives it.
    if (!debouncedQuery) return;

    let active = true;

    async function search() {
      const result = await api.patients.search(debouncedQuery); // await FIRST
      if (!active) return;
      if (result.ok) {
        setResults(result.data);
      } else {
        toast({
          title: "Search failed",
          description: describeApiError(result),
          tone: "danger"
        });
        setResults([]);
      }
      setSearchedFor(debouncedQuery);
    }

    void search();
    return () => {
      active = false;
    };
  }, [debouncedQuery, toast]);

  // Derived flags — entering/leaving the loading state needs no setState.
  const hasSearched = searchedFor !== null && searchedFor === debouncedQuery;
  const isLoading = debouncedQuery !== "" && !hasSearched;

  return (
    <>
      <PageHeader
        title="Patient search"
        subtitle="Search by name or patient code. Results show identity only. Access is checked when you open a patient."
      />

      {/* ── Search bar ── */}
      <div className="relative mb-6 max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-ink-soft" />
        <Input
          id="patient-search-input"
          type="search"
          placeholder="Patient name or code…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
          autoFocus
        />
      </div>

      {/* ── Results ── */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : !hasSearched ? (
        <EmptyState
          title="Start typing to search"
          body="Results appear as you type. Searches work across all hospitals."
        />
      ) : results.length === 0 ? (
        <EmptyState
          title="No patients found"
          icon={<EmptySearchIllustration />}
          body={`No patients match "${debouncedQuery}". Check the spelling or try a patient code.`}
        />
      ) : (
        <div className="space-y-2">
          <p className="text-data text-slate-ink">
            {results.length} {results.length === 1 ? "result" : "results"}
          </p>
          {results.map((patient) => (
            <SearchResultRow key={patient.id} patient={patient} />
          ))}
        </div>
      )}
    </>
  );
}

function SearchResultRow({ patient }: { patient: PatientSearchResult }) {
  return (
    <Link href={`/patients/${patient.id}`} className="block">
      <Card className="hover:bg-paper-dim/50">
        <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
          <PatientIdentityCard
            name={patient.name}
            patientCode={patient.patientCode}
            hospitalId={patient.hospitalId}
          />
          <Button
            variant="outline"
            size="sm"
            tabIndex={-1}
            className="self-start sm:self-center"
          >
            Open
          </Button>
        </CardContent>
      </Card>
    </Link>
  );
}
