"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchPatients } from "@/lib/api";
import { ROUTES } from "@/lib/routes";
import type { PatientIdentity } from "@/types/patient";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientIdentity[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [submitted, setSubmitted] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setSubmitted(q);
    try {
      setResults(await searchPatients(q));
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Patient Search"
        subtitle="Search by name or patient code. Results show identity only, never clinical content or access status."
      />
      <form onSubmit={handleSubmit} className="flex max-w-xl items-end gap-3">
        <div className="flex-1">
          <Input
            label="Patient name or code"
            name="query"
            placeholder="e.g. Marcus Osei or PT-00291-A"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button type="submit" loading={searching}>
          Search
        </Button>
      </form>

      <section className="mt-8 max-w-xl">
        {results === null ? (
          <p className="text-body text-slate">
            Search to find a patient. Access is resolved only when you open a result.
          </p>
        ) : results.length === 0 ? (
          <p className="text-body text-slate">No patients match “{submitted}”.</p>
        ) : (
          <ul className="overflow-hidden rounded border border-section-line bg-white">
            {results.map((patient) => (
              <li key={patient.id} className="border-b border-section-line last:border-0">
                <Link
                  href={ROUTES.patientRecord(patient.id)}
                  className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-paper"
                >
                  <span className="text-body text-ink">{patient.name}</span>
                  <span className="identifier text-dense text-slate">{patient.patientCode}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}