"use client";

/**
 * Screen 11 — Grant Passport / Referral + active-passport revoke list, one screen.
 *
 *   1. Active passports table, per-row Revoke (never offered for BREAK_GLASS —
 *      it expires on its own clock), revokeReason mandatory, immediate effect.
 *   2. Grant form: STANDARD (8h/24h preset) or REFERRAL (fixed 48h, push model —
 *      the receiving worker is named by Health ID at any hospital; the hospital
 *      code field above the Health ID input is a client-side typing aid only).
 *
 * Granting consumes a fresh step-up code. Revoking does not (HANDOFF §3.2).
 */

import { useEffect, useState } from "react";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useStepUp } from "@/hooks/use-step-up";
import { useToast } from "@/hooks/use-toast";
import { api, describeApiError } from "@/lib/api";
import { isRevocable } from "@/lib/passport";
import { DURATION_PRESETS, RECORD_TYPE_LABELS, RECORD_TYPE_ORDER } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { AdminPassport, PatientSearchResult } from "@/types";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldError, FieldHint, Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Countdown } from "@/components/domain/countdown";
import { PassportTypeTag } from "@/components/domain/passport-type-tag";
import { RoleBadge } from "@/components/domain/role-badge";

export default function PassportsPage() {
  const { toast } = useToast();
  const { runWithStepUp } = useStepUp();

  /* ── Active list ── */
  const [passports, setPassports] = useState<AdminPassport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  /* ── Revoke modal ── */
  const [revokeTarget, setRevokeTarget] = useState<AdminPassport | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);

  /* ── Grant form ── */
  const [grantType, setGrantType] = useState<"STANDARD" | "REFERRAL">("STANDARD");
  const [hospitalCode, setHospitalCode] = useState("");
  const [healthId, setHealthId] = useState("");
  const [purpose, setPurpose] = useState("");
  const [scope, setScope] = useState<string[]>([...RECORD_TYPE_ORDER]);
  const [duration, setDuration] = useState<"8H" | "24H">("8H");
  const [grantError, setGrantError] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchResult | null>(null);

  useEffect(() => {
    let active = true;

    async function run() {
      const result = await api.passports.activeList(); // await FIRST
      if (!active) return;
      if (result.ok) {
        setPassports(result.data);
        setListError(null);
      } else {
        setListError(describeApiError(result));
      }
      setIsLoading(false);
    }

    void run();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  function refreshList() {
    setIsLoading(true);
    setReloadKey((key) => key + 1);
  }

  const loweredFilter = filter.trim().toLowerCase();
  const visiblePassports =
    loweredFilter === ""
      ? passports
      : passports.filter(
          (passport) =>
            passport.user.name.toLowerCase().includes(loweredFilter) ||
            passport.user.healthId.toLowerCase().includes(loweredFilter) ||
            passport.patient.name.toLowerCase().includes(loweredFilter) ||
            passport.patient.patientCode.toLowerCase().includes(loweredFilter)
        );

  async function submitRevoke() {
    if (!revokeTarget) return;
    setRevokeError(null);
    if (revokeReason.trim().length === 0) {
      setRevokeError("A revocation reason is required.");
      return;
    }

    setRevoking(true);
    const result = await api.passports.revoke(revokeTarget.id, {
      revokeReason: revokeReason.trim(),
    });
    setRevoking(false);

    if (result.ok) {
      toast({
        title: "Passport revoked",
        description: "Access ended immediately for this worker.",
        tone: "danger",
      });
      setRevokeTarget(null);
      setRevokeReason("");
      refreshList();
      return;
    }
    setRevokeError(describeApiError(result));
  }

  async function submitGrant() {
    setGrantError(null);

    const cleanHealthId = healthId.trim().toUpperCase();
    if (!selectedPatient) {
      setGrantError("Select the patient this passport grants access to.");
      return;
    }
    if (cleanHealthId.length === 0) {
      setGrantError("Enter the receiving worker's Health ID.");
      return;
    }
    if (
      grantType === "REFERRAL" &&
      hospitalCode.trim() &&
      !cleanHealthId.startsWith(`${hospitalCode.trim().toUpperCase()}-`)
    ) {
      setGrantError(`That Health ID doesn't belong to hospital code ${hospitalCode.trim().toUpperCase()}.`);
      return;
    }
    if (purpose.trim().length === 0) {
      setGrantError("State the clinical purpose of this grant.");
      return;
    }
    if (scope.length === 0) {
      setGrantError("Select at least one scope.");
      return;
    }

    const outcome = await runWithStepUp({
      actionLabel: grantType === "STANDARD" ? "Grant access passport" : "Grant referral passport",
      description: `${cleanHealthId} → ${selectedPatient.name}`,
      run: (otpCode) =>
        api.passports.grant({
          type: grantType,
          healthId: cleanHealthId,
          patientId: selectedPatient.id,
          purpose: purpose.trim(),
          scope,
          duration: grantType === "STANDARD" ? duration : undefined,
          otpCode,
        }),
    });

    if (outcome.cancelled || !outcome.result) return;

    if (outcome.result.ok) {
      toast({
        title: "Passport granted",
        description:
          grantType === "REFERRAL"
            ? "Referral is fixed at 48 hours."
            : `Duration: ${duration === "8H" ? "8 hours" : "24 hours"}.`,
        tone: "success",
      });
      setHealthId("");
      setPurpose("");
      setSelectedPatient(null);
      setGrantType("STANDARD");
      setHospitalCode("");
      refreshList();
      return;
    }
    setGrantError(describeApiError(outcome.result));
  }

  return (
    <>
      <PageHeader
        title="Passports"
        subtitle="Grant or revoke patient access. Revocation takes effect immediately."
      />

      {/* ── Part 1: active passports + revoke ── */}
      <section aria-label="Active passports" className="mb-8">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-section font-semibold text-ink">Active passports</h2>
          <Input
            type="search"
            placeholder="Filter by worker or patient…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="sm:w-64"
          />
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : listError ? (
          <EmptyState
            title="Couldn't load active passports"
            body={listError}
            action={
              <Button variant="outline" size="sm" onClick={refreshList}>
                Try again
              </Button>
            }
          />
        ) : visiblePassports.length === 0 ? (
          <EmptyState
            title={passports.length === 0 ? "No active passports" : "No matches"}
            body={
              passports.length === 0
                ? "Nothing is currently granted. Grants and care-team assignments appear here."
                : "No active passports match that filter."
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Worker</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>
                  <span className="sr-only">Revoke</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visiblePassports.map((passport) => (
                <TableRow key={passport.id}>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{passport.user.name}</span>
                      <RoleBadge role={passport.user.role} />
                    </div>
                    <span className="mono text-data text-slate-ink">
                      {passport.user.healthId}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span>{passport.patient.name}</span>
                    <br />
                    <span className="mono text-data text-slate-ink">
                      {passport.patient.patientCode}
                    </span>
                  </TableCell>
                  <TableCell>
                    <PassportTypeTag type={passport.type} />
                  </TableCell>
                  <TableCell>
                    <span className="block max-w-48 truncate" title={passport.purpose}>
                      {passport.purpose}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Countdown target={passport.expiresAt} />
                  </TableCell>
                  <TableCell>
                    {isRevocable(passport) ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-alert-coral/40 text-alert-coral hover:bg-alert-coral-soft"
                        onClick={() => {
                          setRevokeTarget(passport);
                          setRevokeReason("");
                          setRevokeError(null);
                        }}
                      >
                        Revoke
                      </Button>
                    ) : (
                      <span className="text-data text-slate-ink-soft">Expires on its own</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      {/* ── Part 2: grant form ── */}
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Grant passport / referral</CardTitle>
          <CardDescription>
            Direct grant outside the request flow. Referral is push-model: name the
            receiving worker by Health ID, they never search or request. Consumes a
            fresh step-up code.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="grantType">Type</Label>
              <Select
                id="grantType"
                className="mt-1"
                value={grantType}
                onChange={(e) => setGrantType(e.target.value as "STANDARD" | "REFERRAL")}
              >
                <option value="STANDARD">Standard: Own-hospital worker</option>
                <option value="REFERRAL">Referral: Receiving worker, any hospital</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="grantDuration">Duration</Label>
              {grantType === "STANDARD" ? (
                <Select
                  id="grantDuration"
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
              ) : (
                <p className="mt-1 rounded-sm border border-line bg-paper-dim px-3 py-2 text-data text-slate-ink">
                  Referral is fixed at 48 hours, not editable.
                </p>
              )}
            </div>
          </div>

          {grantType === "REFERRAL" ? (
            <div>
              <Label htmlFor="hospitalCode">Receiving hospital code</Label>
              <Input
                id="hospitalCode"
                mono
                placeholder="RSH"
                className="mt-1 sm:max-w-40"
                value={hospitalCode}
                onChange={(e) => setHospitalCode(e.target.value.toUpperCase())}
              />
              <FieldHint>
                Optional typing aid: the Health ID below must start with this code.
                The server validates the worker exists and is active.
              </FieldHint>
            </div>
          ) : null}

          <div>
            <Label htmlFor="grantHealthId">Receiving worker Health ID</Label>
            <Input
              id="grantHealthId"
              mono
              placeholder={grantType === "REFERRAL" && hospitalCode ? `${hospitalCode}-DOC-0001` : "LUTH-DOC-0001"}
              className="mt-1 sm:max-w-64"
              value={healthId}
              onChange={(e) => setHealthId(e.target.value.toUpperCase())}
            />
          </div>

          <PatientPicker selected={selectedPatient} onSelect={setSelectedPatient} />

          <div>
            <Label htmlFor="grantPurpose">Purpose</Label>
            <Input
              id="grantPurpose"
              className="mt-1"
              placeholder="e.g. Cardiology consultation during admission"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />
          </div>

          <fieldset>
            <legend className="text-body font-medium text-ink">Scope</legend>
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

          {grantError ? (
            <div role="alert">
              <FieldError>{grantError}</FieldError>
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button variant="trust" onClick={() => void submitGrant()}>
              Grant passport
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Revoke confirmation modal ── */}
      <Modal
        open={revokeTarget !== null}
        onClose={() => setRevokeTarget(null)}
        title="Revoke this passport?"
        description={
          revokeTarget
            ? `${revokeTarget.user.name} loses access to ${revokeTarget.patient.name} immediately. CheckAccess reads live state on their next request.`
            : undefined
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setRevokeTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={revoking}
              disabled={revokeReason.trim().length === 0}
              onClick={() => void submitRevoke()}
            >
              Revoke now
            </Button>
          </>
        }
      >
        <Label htmlFor="revokeReason">Revocation reason</Label>
        <Textarea
          id="revokeReason"
          rows={3}
          className="mt-1"
          placeholder="e.g. Clinical purpose ended / patient no longer under this worker's care"
          value={revokeReason}
          onChange={(e) => setRevokeReason(e.target.value)}
        />
        <FieldError>{revokeError}</FieldError>
      </Modal>
    </>
  );
}

/* ── Patient picker: debounced identity-only search, select one ── */

function PatientPicker({
  selected,
  onSelect,
}: {
  selected: PatientSearchResult | null;
  onSelect: (patient: PatientSearchResult | null) => void;
}) {
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query.trim(), 300);
  const [results, setResults] = useState<PatientSearchResult[]>([]);
  const [searchedFor, setSearchedFor] = useState<string | null>(null);

  useEffect(() => {
    if (!debounced) return;
    let active = true;

    async function run() {
      const result = await api.patients.search(debounced); // await FIRST
      if (!active) return;
      setResults(result.ok ? result.data : []);
      setSearchedFor(debounced);
    }

    void run();
    return () => {
      active = false;
    };
  }, [debounced]);

  const searching = debounced !== "" && searchedFor !== debounced;

  if (selected) {
    return (
      <div>
        <p className="text-data font-medium text-slate-ink">Patient</p>
        <div className="mt-1 flex flex-wrap items-center gap-3 rounded-sm border border-line bg-paper-dim px-3 py-2">
          <span className="text-body font-medium text-ink">{selected.name}</span>
          <span className="mono text-data text-slate-ink">{selected.patientCode}</span>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="text-data font-medium text-deep-indigo hover:underline"
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Label htmlFor="patientSearch">Patient</Label>
      <Input
        id="patientSearch"
        type="search"
        placeholder="Search by name or patient code…"
        className="mt-1"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {searching ? (
        <p className="mt-2 text-data text-slate-ink">Searching…</p>
      ) : debounced !== "" && results.length === 0 ? (
        <p className="mt-2 text-data text-slate-ink">No patients match that search.</p>
      ) : results.length > 0 ? (
        <ul className={cn("mt-2 max-h-48 divide-y divide-line overflow-y-auto rounded-sm border border-line bg-white")}>
          {results.map((patient) => (
            <li key={patient.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(patient);
                  setQuery("");
                  setResults([]);
                  setSearchedFor(null);
                }}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-paper-dim"
              >
                <span className="text-body text-ink">{patient.name}</span>
                <span className="mono text-data text-slate-ink">{patient.patientCode}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}