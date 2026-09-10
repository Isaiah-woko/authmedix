"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api/client";
import { getStaff, type StaffRow } from "@/lib/api/admin";
import { formatRole } from "@/lib/format";

type Duration = "8H" | "24H";

export default function RegisterPatientPage() {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [allergies, setAllergies] = useState("");
  const [careTeam, setCareTeam] = useState<string[]>([]);
  const [duration, setDuration] = useState<Duration>("8H");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ patientCode: string; grantedTo: string[] } | null>(null);

  useEffect(() => {
    getStaff()
      .then((rows) => setStaff(rows.filter((r) => r.status === "ACTIVE" && r.role !== "ADMIN")))
      .catch(() => setStaff([]));
  }, []);

  function toggleMember(healthId: string) {
    setCareTeam((prev) =>
      prev.includes(healthId) ? prev.filter((h) => h !== healthId) : [...prev, healthId]
    );
  }

  function nameOf(healthId: string): string {
    return staff.find((s) => s.healthId === healthId)?.name ?? healthId;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Patient name is required.");
      return;
    }
    if (!dob) {
      setError("Date of birth is required.");
      return;
    }
    setSubmitting(true);
    try {
      const allergyList = allergies
        .split(",")
        .map((a) => a.trim())
        .filter((a) => a.length > 0);
      const res = await api.post<{ id: string; patientCode: string; grantedTo?: string[] }>(
        "/patients",
        { name: name.trim(), dob, allergies: allergyList, careTeam, duration }
      );
      setResult({ patientCode: res.patientCode, grantedTo: res.grantedTo ?? [] });
      setName("");
      setDob("");
      setAllergies("");
      setCareTeam([]);
      setDuration("8H");
    } catch (err) {
      const e = err as { message?: string };
      setError(e.message ?? "Could not register the patient.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Register Patient"
        subtitle="Create a patient record and assign the care team. This is the primary way access gets granted."
      />
      {error && (
        <div className="mb-4 max-w-2xl">
          <Alert tone="error">{error}</Alert>
        </div>
      )}
      {result && (
        <section className="mb-6 max-w-lg rounded border border-trust-teal/40 bg-trust-teal/10 p-6">
          <p className="text-body-lg font-semibold text-trust-teal">Patient registered</p>
          <p className="mt-1 text-body text-slate">Share this patient code with the care team:</p>
          <p className="identifier mt-2 text-body-lg text-ink">{result.patientCode}</p>
          {result.grantedTo.length > 0 ? (
            <p className="mt-2 text-dense text-slate">
              Initial passports granted to: {result.grantedTo.map(nameOf).join(", ")}
            </p>
          ) : (
            <p className="mt-2 text-dense text-slate">
              No care team assigned yet. Access must be requested or granted later.
            </p>
          )}
        </section>
      )}

      <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-5">
        <Input label="Full name" name="name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input
          label="Date of birth"
          name="dob"
          type="date"
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          required
        />
        <Input
          label="Allergies (comma separated, optional)"
          name="allergies"
          placeholder="Penicillin, Peanuts"
          value={allergies}
          onChange={(e) => setAllergies(e.target.value)}
        />

        <fieldset>
          <legend className="text-body font-medium text-ink">Care team</legend>
          <p className="mt-1 text-dense text-slate">
            Each selected worker receives an initial Standard passport for the duration below.
          </p>
          <div className="mt-2 flex flex-col gap-2">
            {staff.length === 0 ? (
              <p className="text-dense text-slate">No active clinical workers available.</p>
            ) : (
              staff.map((member) => (
                <label
                  key={member.id}
                  className="flex cursor-pointer items-center gap-2 text-body text-ink"
                >
                  <input
                    type="checkbox"
                    checked={careTeam.includes(member.healthId)}
                    onChange={() => toggleMember(member.healthId)}
                    className="h-4 w-4 rounded border-section-line"
                  />
                  {member.name} · {formatRole(member.role)}{" "}
                  <span className="identifier text-dense text-slate">{member.healthId}</span>
                </label>
              ))
            )}
          </div>
        </fieldset>

        <div>
          <p className="text-body font-medium text-ink">Initial passport duration</p>
          <div className="mt-2 flex gap-2">
            {(["8H", "24H"] as Duration[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setDuration(option)}
                className={`rounded border px-3 py-1.5 text-body transition-colors ${
                  duration === option
                    ? "border-deep-indigo bg-deep-indigo/10 font-medium text-deep-indigo"
                    : "border-section-line bg-white text-slate hover:bg-paper"
                }`}
              >
                {option === "8H" ? "8 hours, standard" : "24 hours, extended"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Button type="submit" loading={submitting}>
            Register patient
          </Button>
        </div>
      </form>
    </>
  );
}