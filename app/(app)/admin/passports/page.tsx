"use client";

import { useCallback, useEffect, useState } from "react";
import { StepUpModal } from "@/components/admin/step-up-modal";
import { PageHeader } from "@/components/layout/page-header";
import { PassportTypeBadge } from "@/components/patients/passport-type-badge";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchPatients } from "@/lib/api";
import { getStaff, type StaffRow } from "@/lib/api/admin";
import {
  getActivePassports,
  grantPassport,
  revokePassport,
  type ActivePassportRow,
} from "@/lib/api/passports";
import { useCountdown } from "@/hooks/use-countdown";
import { formatCountdownCompact } from "@/lib/dates";
import type { PatientIdentity } from "@/types/patient";

type GrantType = "STANDARD" | "REFERRAL";
type Duration = "8H" | "24H";

function RowCountdown({ passport }: { passport: ActivePassportRow }) {
  const remaining = useCountdown(passport.expiresAt);
  const expired = remaining?.isExpired === true;
  const soon = !expired && (remaining?.totalSeconds ?? 0) <= 30 * 60;
  const tone = expired
    ? "text-alert-coral"
    : soon
      ? "text-amber-watch"
      : passport.type === "BREAK_GLASS"
        ? "text-alert-coral"
        : passport.type === "REFERRAL"
          ? "text-deep-indigo"
          : "text-trust-teal";
  return (
    <span className={`identifier text-dense ${tone}`}>
      {formatCountdownCompact(passport.expiresAt)}
    </span>
  );
}

export default function GrantPassportPage() {
  const [passports, setPassports] = useState<ActivePassportRow[] | null>(null);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [grantType, setGrantType] = useState<GrantType>("STANDARD");
  const [targetHealthId, setTargetHealthId] = useState("");
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState<PatientIdentity[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientIdentity | null>(null);
  const [purpose, setPurpose] = useState("");
  const [scope, setScope] = useState("Notes, Labs, Prescriptions, Uploads, Allergies");
  const [duration, setDuration] = useState<Duration>("8H");
  const [grantOpen, setGrantOpen] = useState(false);

  const [revokeTarget, setRevokeTarget] = useState<ActivePassportRow | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [revokeSubmitting, setRevokeSubmitting] = useState(false);

  const load = useCallback(() => {
    return getActivePassports()
      .then(setPassports)
      .catch(() => setPassports([]));
  }, []);

  useEffect(() => {
    load();
    getStaff()
      .then(setStaff)
      .catch(() => setStaff([]));
  }, [load]);

  async function findPatients() {
    const q = patientQuery.trim();
    if (!q) return;
    try {
      setPatientResults(await searchPatients(q));
    } catch {
      setPatientResults([]);
    }
  }

  function openGrant() {
    setError(null);
    if (!targetHealthId.trim()) {
      setError("Choose or type the target worker's Health ID.");
      return;
    }
    if (!selectedPatient) {
      setError("Search and select a patient.");
      return;
    }
    setGrantOpen(true);
  }

  async function handleGrant(otpCode: string) {
    await grantPassport({
      type: grantType,
      healthId: targetHealthId.trim(),
      patientId: selectedPatient?.id ?? "",
      purpose:
        purpose.trim() ||
        (grantType === "REFERRAL"
          ? "Inter-hospital referral"
          : "Clinical consultation and treatment"),
      scope: scope.trim() || "Notes, Labs, Prescriptions, Uploads, Allergies",
      duration: grantType === "STANDARD" ? duration : undefined,
      otpCode,
    });
    setNotice(
      `Passport granted to ${targetHealthId.trim()} for ${selectedPatient?.name ?? "the patient"}.`
    );
    setGrantOpen(false);
    setTargetHealthId("");
    setSelectedPatient(null);
    setPatientResults([]);
    setPatientQuery("");
    setPurpose("");
    await load();
  }

  async function handleRevoke() {
    if (!revokeTarget) return;
    const reason = revokeReason.trim();
    if (!reason) {
      setRevokeError("A revoke reason is required.");
      return;
    }
    setRevokeSubmitting(true);
    setRevokeError(null);
    try {
      await revokePassport(revokeTarget.id, { revokeReason: reason });
      setNotice(
        `Passport for ${revokeTarget.patientName ?? "the patient"} revoked. The change is immediate.`
      );
      setRevokeTarget(null);
      setRevokeReason("");
      await load();
    } catch (err) {
      const e = err as { message?: string };
      setRevokeError(e.message ?? "Could not revoke this passport.");
    } finally {
      setRevokeSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Grant Passport / Referral"
        subtitle="Grant access directly, push a referral to another hospital, or revoke access before expiry."
      />
      {error && (
        <div className="mb-4 max-w-2xl">
          <Alert tone="error">{error}</Alert>
        </div>
      )}
      {notice && (
        <div className="mb-4 max-w-2xl">
          <Alert tone="success">{notice}</Alert>
        </div>
      )}

      <section className="max-w-2xl rounded border border-section-line bg-white p-6">
        <p className="text-section-header font-semibold text-ink">Grant a passport</p>
        <div className="mt-4 flex gap-2">
          {(["STANDARD", "REFERRAL"] as GrantType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setGrantType(type)}
              className={`rounded border px-3 py-1.5 text-body transition-colors ${
                grantType === type
                  ? "border-deep-indigo bg-deep-indigo/10 font-medium text-deep-indigo"
                  : "border-section-line bg-white text-slate hover:bg-paper"
              }`}
            >
              {type === "STANDARD" ? "Standard grant" : "Referral (push)"}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-4">
          {grantType === "STANDARD" ? (
            <div>
              <label className="text-body font-medium text-ink" htmlFor="target">
                Target worker
              </label>
              <select
                id="target"
                value={targetHealthId}
                onChange={(e) => setTargetHealthId(e.target.value)}
                className="mt-1 w-full rounded border border-section-line bg-white px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-deep-indigo/30"
              >
                <option value="">Select a worker…</option>
                {staff.map((member) => (
                  <option key={member.id} value={member.healthId}>
                    {member.name} · {member.healthId}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <Input
              label="Receiving worker Health ID (any hospital)"
              name="targetHealthId"
              identifier
              placeholder="RSH-DOC-0001"
              value={targetHealthId}
              onChange={(e) => setTargetHealthId(e.target.value)}
            />
          )}

          <div>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Input
                  label="Patient search"
                  name="patientQuery"
                  placeholder="Name or patient code"
                  value={patientQuery}
                  onChange={(e) => setPatientQuery(e.target.value)}
                />
              </div>
              <Button type="button" variant="secondary" onClick={findPatients}>
                Search
              </Button>
            </div>
            {patientResults.length > 0 && !selectedPatient && (
              <ul className="mt-2 overflow-hidden rounded border border-section-line bg-white">
                {patientResults.slice(0, 5).map((patient) => (
                  <li key={patient.id} className="border-b border-section-line last:border-0">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:bg-paper"
                      onClick={() => setSelectedPatient(patient)}
                    >
                      <span className="text-body text-ink">{patient.name}</span>
                      <span className="identifier text-dense text-slate">
                        {patient.patientCode}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {selectedPatient && (
              <p className="mt-2 text-body text-ink">
                Selected: {selectedPatient.name}{" "}
                <span className="identifier text-dense text-slate">
                  {selectedPatient.patientCode}
                </span>{" "}
                <button
                  type="button"
                  className="text-dense text-deep-indigo hover:underline"
                  onClick={() => setSelectedPatient(null)}
                >
                  change
                </button>
              </p>
            )}
          </div>

          <Input
            label="Purpose"
            name="purpose"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder={
              grantType === "REFERRAL"
                ? "Inter-hospital referral"
                : "Clinical consultation and treatment"
            }
          />
          <Input label="Scope" name="scope" value={scope} onChange={(e) => setScope(e.target.value)} />

          <div>
            <p className="text-body font-medium text-ink">Duration</p>
            {grantType === "STANDARD" ? (
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
            ) : (
              <p className="mt-1 text-body text-slate">
                Referral passports are fixed at 48 hours. Not editable.
              </p>
            )}
          </div>

          <div>
            <Button onClick={openGrant}>Grant passport</Button>
          </div>
        </div>
      </section>

      <section className="mt-8 overflow-hidden rounded border border-section-line bg-white">
        <div className="border-b border-section-line px-4 py-3">
          <p className="text-body font-medium text-ink">Currently active passports</p>
        </div>
        {passports === null ? (
          <p className="px-4 py-6 text-body text-slate">Loading active passports…</p>
        ) : passports.length === 0 ? (
          <p className="px-4 py-6 text-body text-slate">No active passports right now.</p>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-section-line">
                <th className="px-4 py-3 text-body font-medium text-slate">Patient</th>
                <th className="px-4 py-3 text-body font-medium text-slate">Holder</th>
                <th className="px-4 py-3 text-body font-medium text-slate">Type</th>
                <th className="px-4 py-3 text-body font-medium text-slate">Time remaining</th>
                <th className="px-4 py-3 text-body font-medium text-slate">Actions</th>
              </tr>
            </thead>
            <tbody>
              {passports.map((passport) => (
                <tr key={passport.id} className="border-b border-section-line last:border-0">
                  <td className="px-4 py-3">
                    <p className="text-body text-ink">{passport.patientName}</p>
                    <p className="identifier text-dense text-slate">{passport.patientCode}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-body text-ink">{passport.holderName}</p>
                    <p className="identifier text-dense text-slate">{passport.holderHealthId}</p>
                  </td>
                  <td className="px-4 py-3">
                    <PassportTypeBadge type={passport.type} />
                  </td>
                  <td className="px-4 py-3">
                    <RowCountdown passport={passport} />
                  </td>
                  <td className="px-4 py-3">
                    {passport.type === "BREAK_GLASS" ? (
                      <span className="text-dense text-slate">Expires on its own clock</span>
                    ) : (
                      <Button
                        variant="danger"
                        onClick={() => {
                          setRevokeTarget(passport);
                          setRevokeReason("");
                          setRevokeError(null);
                        }}
                      >
                        Revoke
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {grantOpen && (
        <StepUpModal
          actionLabel={`Granting a ${grantType === "REFERRAL" ? "referral" : "standard"} passport to ${targetHealthId}`}
          onConfirm={handleGrant}
          onClose={() => setGrantOpen(false)}
        />
      )}

      {revokeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
          <div className="w-full max-w-sm rounded border border-alert-coral/40 bg-white p-6 shadow-lg">
            <p className="text-section-header font-semibold text-alert-coral">
              Revoke this passport?
            </p>
            <p className="mt-2 text-body text-slate">
              {revokeTarget.holderName} loses access to {revokeTarget.patientName} immediately. This
              cannot be undone.
            </p>
            <div className="mt-4">
              <label className="text-body font-medium text-ink" htmlFor="revokeReason">
                Reason
              </label>
              <textarea
                id="revokeReason"
                rows={3}
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                className="mt-1 w-full rounded border border-section-line bg-white px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-alert-coral/30"
                placeholder="Clinical purpose ended, patient no longer under this worker's care…"
              />
              {revokeError ? (
                <p className="mt-1 text-dense text-alert-coral">{revokeError}</p>
              ) : null}
            </div>
            <div className="mt-4 flex gap-3">
              <Button variant="danger" onClick={handleRevoke} loading={revokeSubmitting}>
                Revoke now
              </Button>
              <Button
                variant="secondary"
                onClick={() => setRevokeTarget(null)}
                disabled={revokeSubmitting}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}