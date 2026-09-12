"use client";

/**
 * Screen 14 — Flagged Review Queue (Admin).
 * Unreviewed BREAK_GLASS events; highPriority rows (repeat use by the same
 * worker — the protocol's rising risk signal) surface first with an Amber tag.
 * Review = modal with optional note; :id is the AccessPassport id (the row's
 * id), per HANDOFF §3.9. Empty is a GOOD state: nothing to review.
 */

import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { api, describeApiError } from "@/lib/api";
import { BREAK_GLASS_REASONS } from "@/lib/constants";
import { formatDateTime, formatTimestamp } from "@/lib/utils";
import type { FlaggedEvent } from "@/types";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldError, FieldHint, Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { FlaggedPriorityTag } from "@/components/domain/flagged-priority-tag";
import { PatientCodeDisplay } from "@/components/domain/patient-code-display";
import { RoleBadge } from "@/components/domain/role-badge";

export default function FlaggedReviewPage() {
  const { toast } = useToast();

  const [events, setEvents] = useState<FlaggedEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [reviewTarget, setReviewTarget] = useState<FlaggedEvent | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function run() {
      const result = await api.admin.flaggedQueue(); // await FIRST
      if (!active) return;
      if (result.ok) {
        setEvents(result.data);
        setError(null);
      } else {
        setError(describeApiError(result));
      }
      setIsLoading(false);
    }

    void run();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  // High-priority first, then newest first.
  const sorted = [...events].sort((a, b) =>
    a.highPriority === b.highPriority
      ? b.createdAt.localeCompare(a.createdAt)
      : a.highPriority
        ? -1
        : 1
  );

  function openReview(event: FlaggedEvent) {
    setReviewTarget(event);
    setReviewNote("");
    setReviewError(null);
  }

  function reload() {
    setIsLoading(true);
    setReloadKey((key) => key + 1);
  }

  async function submitReview() {
    if (!reviewTarget) return;
    setReviewing(true);
    setReviewError(null);

    const result = await api.admin.reviewFlagged(reviewTarget.id, {
      reviewNote: reviewNote.trim() || undefined,
    });
    setReviewing(false);

    if (result.ok) {
      toast({
        title: "Event marked reviewed",
        description: "It leaves this queue immediately.",
        tone: "success",
      });
      setReviewTarget(null);
      reload();
      return;
    }
    if (result.status === 404) {
      // Another admin reviewed it first — replay is impossible by design.
      setReviewError("This event was already reviewed — the queue has been refreshed.");
      reload();
      return;
    }
    setReviewError(describeApiError(result));
  }

  return (
    <>
      <PageHeader
        title="Flagged review"
        subtitle="Every break-glass invocation lands here for after-the-fact review. High-priority rows repeat the protocol's risk signals."
      />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : error ? (
        <EmptyState
          title="Couldn't load the queue"
          body={error}
          action={
            <Button variant="outline" size="sm" onClick={reload}>
              Try again
            </Button>
          }
        />
      ) : sorted.length === 0 ? (
        <EmptyState
          title="No flagged events to review"
          body="Every break-glass invocation so far has been reviewed. New ones appear here the moment they happen."
        />
      ) : (
        <div className="space-y-3">
          {sorted.map((event) => (
            <Card
              key={event.id}
              className={event.highPriority ? "border-l-4 border-l-amber-watch" : undefined}
            >
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {event.highPriority ? <FlaggedPriorityTag /> : null}
                  <span className="text-body font-medium text-ink">{event.user.name}</span>
                  <RoleBadge role={event.user.role} />
                  <span className="mono text-data text-slate-ink">{event.user.healthId}</span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-data text-slate-ink">
                  <span>
                    Patient: <span className="font-medium text-ink">{event.patient.name}</span>{" "}
                    <PatientCodeDisplay code={event.patient.patientCode} />
                  </span>
                  <span>
                    Invoked <span className="mono">{formatTimestamp(event.createdAt)}</span>
                  </span>
                  <span>
                    Expired <span className="mono">{formatDateTime(event.expiresAt)}</span>
                  </span>
                </div>

                <div>
                  <p className="text-data font-medium text-slate-ink">
                    Category:{" "}
                    <span className="text-ink">
                      {BREAK_GLASS_REASONS.find((r) => r.value === event.reasonCategory)?.label ??
                        event.reasonCategory}
                    </span>
                  </p>
                  <p className="mt-1 whitespace-pre-wrap rounded-sm border border-line bg-paper-dim p-2 text-body text-ink">
                    {event.reasonDetail}
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button variant="amber" size="sm" onClick={() => openReview(event)}>
                    Review
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Review modal ── */}
      <Modal
        open={reviewTarget !== null}
        onClose={() => setReviewTarget(null)}
        title="Review break-glass event"
        description={
          reviewTarget ? `${reviewTarget.user.name} → ${reviewTarget.patient.name}` : undefined
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setReviewTarget(null)}>
              Cancel
            </Button>
            <Button variant="trust" loading={reviewing} onClick={() => void submitReview()}>
              Mark reviewed
            </Button>
          </>
        }
      >
        {reviewTarget ? (
          <div className="space-y-3">
            {reviewTarget.highPriority ? (
              <div className="flex flex-wrap items-center gap-2">
                <FlaggedPriorityTag />
                <FieldHint>Repeat break-glass use by this worker — a rising risk signal.</FieldHint>
              </div>
            ) : null}

            <p className="text-data text-slate-ink">
              Category:{" "}
              <span className="text-ink">
                {BREAK_GLASS_REASONS.find((r) => r.value === reviewTarget.reasonCategory)?.label ??
                  reviewTarget.reasonCategory}
              </span>
            </p>

            <p className="whitespace-pre-wrap rounded-sm border border-line bg-paper-dim p-2 text-body text-ink">
              {reviewTarget.reasonDetail}
            </p>

            <div>
              <Label htmlFor="reviewNote">Review note (optional)</Label>
              <Textarea
                id="reviewNote"
                rows={3}
                className="mt-1"
                placeholder="e.g. Justification matches ED admission record; no further action."
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
              />
            </div>

            {reviewError ? (
              <div role="alert">
                <FieldError>{reviewError}</FieldError>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </>
  );
}