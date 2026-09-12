"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getFlaggedEvents, markEventReviewed, type FlaggedRow } from "@/lib/api/admin";
import { formatDateTime } from "@/lib/dates";

const CATEGORY_LABELS: Record<string, string> = {
  LIFE_THREATENING: "Life-threatening emergency",
  UNCONSCIOUS_UNRESPONSIVE: "Unconscious or unresponsive patient",
  MEDICATION_ALLERGY_EMERGENCY: "Medication or allergy emergency",
  TRAUMA: "Trauma",
  CRITICAL_DIAGNOSTIC_INFO: "Critical diagnostic information required",
  OTHER: "Other",
};

export default function FlaggedReviewPage() {
  const [events, setEvents] = useState<FlaggedRow[] | null>(null);
  const [reviewTarget, setReviewTarget] = useState<FlaggedRow | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    return getFlaggedEvents()
      .then(setEvents)
      .catch(() => setEvents([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleReview() {
    if (!reviewTarget) return;
    setSubmitting(true);
    setError(null);
    try {
      await markEventReviewed(reviewTarget.id, { reviewNote: note.trim() || undefined });
      setNotice("Event marked as reviewed.");
      setReviewTarget(null);
      setNote("");
      await load();
    } catch (err) {
      const e = err as { message?: string };
      setError(e.message ?? "Could not mark this event reviewed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Flagged Review"
        subtitle="Unreviewed break-glass activations. High-priority patterns surface first."
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

      {events === null ? (
        <p className="text-body text-slate">Loading flagged events…</p>
      ) : events.length === 0 ? (
        <section className="max-w-lg rounded border border-section-line bg-white p-6">
          <p className="text-body-lg font-medium text-ink">No flagged events to review</p>
          <p className="mt-1 text-body text-slate">
            Every break-glass activation has been reviewed. This is a good state.
          </p>
        </section>
      ) : (
        <section className="overflow-hidden rounded border border-section-line bg-white">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-section-line">
                <th className="px-4 py-3 text-body font-medium text-slate">Worker</th>
                <th className="px-4 py-3 text-body font-medium text-slate">Patient</th>
                <th className="px-4 py-3 text-body font-medium text-slate">Reason</th>
                <th className="px-4 py-3 text-body font-medium text-slate">When</th>
                <th className="px-4 py-3 text-body font-medium text-slate">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-b border-section-line last:border-0">
                  <td className="px-4 py-3">
                    <p className="text-body text-ink">
                      {event.userName}
                      {event.highPriority && (
                        <span className="ml-2 inline-block rounded border border-amber-watch/40 bg-amber-watch/10 px-2 py-0.5 text-dense font-medium text-amber-watch">
                          High priority
                        </span>
                      )}
                    </p>
                    <p className="identifier text-dense text-slate">{event.userHealthId}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-body text-ink">{event.patientName}</p>
                    <p className="identifier text-dense text-slate">{event.patientCode}</p>
                  </td>
                  <td className="max-w-sm px-4 py-3">
                    <p className="text-body text-ink">
                      {CATEGORY_LABELS[event.reasonCategory ?? ""] ?? event.reasonCategory ?? "Unknown"}
                    </p>
                    <p className="mt-0.5 text-dense text-slate">{event.reasonDetail}</p>
                  </td>
                  <td className="identifier px-4 py-3 text-dense text-slate">
                    {formatDateTime(event.timestamp)}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setReviewTarget(event);
                        setNote("");
                      }}
                    >
                      Mark reviewed
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {reviewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
          <div className="w-full max-w-sm rounded border border-section-line bg-white p-6 shadow-lg">
            <p className="text-section-header font-semibold text-ink">Review this event</p>
            <p className="mt-2 text-body text-slate">
              {reviewTarget.userName} accessed {reviewTarget.patientName} via break-glass. Add an
              optional review note for the audit trail.
            </p>
            <div className="mt-4">
              <label className="text-body font-medium text-ink" htmlFor="reviewNote">
                Review note (optional)
              </label>
              <textarea
                id="reviewNote"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1 w-full rounded border border-section-line bg-white px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-deep-indigo/30"
                placeholder="Justification consistent with emergency protocol…"
              />
            </div>
            <div className="mt-4 flex gap-3">
              <Button onClick={handleReview} loading={submitting}>
                Mark reviewed
              </Button>
              <Button variant="secondary" onClick={() => setReviewTarget(null)} disabled={submitting}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}