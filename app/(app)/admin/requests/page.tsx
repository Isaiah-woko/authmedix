"use client";

import { useCallback, useEffect, useState } from "react";
import { StepUpModal } from "@/components/admin/step-up-modal";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { approveRequest, denyRequest, getPassportRequests } from "@/lib/api";
import type { PassportRequestItem } from "@/lib/api/passport-requests";
import { formatDateTime } from "@/lib/dates";

type Duration = "8H" | "24H";

export default function RequestsQueuePage() {
  const [requests, setRequests] = useState<PassportRequestItem[] | null>(null);
  const [approveTarget, setApproveTarget] = useState<PassportRequestItem | null>(null);
  const [duration, setDuration] = useState<Duration>("8H");
  const [denyTarget, setDenyTarget] = useState<PassportRequestItem | null>(null);
  const [denialReason, setDenialReason] = useState("");
  const [denyError, setDenyError] = useState<string | null>(null);
  const [denySubmitting, setDenySubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    return getPassportRequests("pending")
      .then(setRequests)
      .catch(() => setRequests([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleApprove(otpCode: string) {
    if (!approveTarget) return;
    try {
      await approveRequest(approveTarget.id, { duration, otpCode });
      setNotice(
        `Approved access to ${approveTarget.patientName ?? "the patient"} for ${
          duration === "8H" ? "8 hours" : "24 hours"
        }.`
      );
      setApproveTarget(null);
      await load();
    } catch (err) {
      const e = err as { status?: number; message?: string };
      if (e.status === 404) {
        setApproveTarget(null);
        setError("That request was already reviewed. The queue has been refreshed.");
        await load();
      } else {
        throw err;
      }
    }
  }

  async function handleDeny() {
    if (!denyTarget) return;
    const reason = denialReason.trim();
    if (!reason) {
      setDenyError("A denial reason is required.");
      return;
    }
    setDenySubmitting(true);
    setDenyError(null);
    try {
      await denyRequest(denyTarget.id, { denialReason: reason });
      setNotice("Request denied with the reason recorded.");
      setDenyTarget(null);
      setDenialReason("");
      await load();
    } catch (err) {
      const e = err as { message?: string };
      setDenyError(e.message ?? "Could not deny the request.");
    } finally {
      setDenySubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Requests Queue"
        subtitle="Pending access requests from clinical workers. Approve with a duration preset, or deny with a reason."
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

      {requests === null ? (
        <p className="text-body text-slate">Loading the queue…</p>
      ) : requests.length === 0 ? (
        <section className="max-w-lg rounded border border-section-line bg-white p-6">
          <p className="text-body-lg font-medium text-ink">No pending requests</p>
          <p className="mt-1 text-body text-slate">Nothing is waiting on you right now.</p>
        </section>
      ) : (
        <section className="overflow-hidden rounded border border-section-line bg-white">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-section-line">
                <th className="px-4 py-3 text-body font-medium text-slate">Patient</th>
                <th className="px-4 py-3 text-body font-medium text-slate">Requester</th>
                <th className="px-4 py-3 text-body font-medium text-slate">Purpose</th>
                <th className="px-4 py-3 text-body font-medium text-slate">Submitted</th>
                <th className="px-4 py-3 text-body font-medium text-slate">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id} className="border-b border-section-line last:border-0">
                  <td className="px-4 py-3">
                    <p className="text-body text-ink">{request.patientName}</p>
                    <p className="identifier text-dense text-slate">{request.patientCode}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-body text-ink">{request.userName}</p>
                    <p className="identifier text-dense text-slate">{request.userHealthId}</p>
                  </td>
                  <td className="max-w-xs px-4 py-3">
                    <p className="text-body text-ink">{request.purpose}</p>
                    <p className="text-dense text-slate">{request.scope}</p>
                  </td>
                  <td className="identifier px-4 py-3 text-dense text-slate">
                    {formatDateTime(request.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setApproveTarget(request);
                          setDuration("8H");
                        }}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => {
                          setDenyTarget(request);
                          setDenialReason("");
                          setDenyError(null);
                        }}
                      >
                        Deny
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {approveTarget && (
        <StepUpModal
          key={approveTarget.id}
          actionLabel={`Approving access to ${approveTarget.patientName ?? "this patient"}`}
          onConfirm={handleApprove}
          onClose={() => setApproveTarget(null)}
        >
          <fieldset className="mt-4">
            <legend className="text-body font-medium text-ink">Duration</legend>
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
          </fieldset>
        </StepUpModal>
      )}

      {denyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
          <div className="w-full max-w-sm rounded border border-section-line bg-white p-6 shadow-lg">
            <p className="text-section-header font-semibold text-ink">Deny this request</p>
            <p className="mt-1 text-body text-slate">
              {denyTarget.userName} will not receive access to {denyTarget.patientName}. The reason
              is recorded in the audit log.
            </p>
            <div className="mt-4">
              <label className="text-body font-medium text-ink" htmlFor="denialReason">
                Reason
              </label>
              <textarea
                id="denialReason"
                rows={3}
                value={denialReason}
                onChange={(e) => setDenialReason(e.target.value)}
                className="mt-1 w-full rounded border border-section-line bg-white px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-alert-coral/30"
                placeholder="Outside current care needs, duplicate request, insufficient purpose…"
              />
              {denyError ? (
                <p className="mt-1 text-dense text-alert-coral">{denyError}</p>
              ) : null}
            </div>
            <div className="mt-4 flex gap-3">
              <Button variant="danger" onClick={handleDeny} loading={denySubmitting}>
                Deny request
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setDenyTarget(null);
                  setDenyError(null);
                }}
                disabled={denySubmitting}
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