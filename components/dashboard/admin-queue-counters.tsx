import Link from "next/link";
import { ROUTES } from "@/lib/routes";

/** Admin's two working queues. Amber = pending, Coral = flagged. Nothing decorative. */
export function AdminQueueCounters({
  pendingRequests,
  unreviewedFlagged,
}: {
  pendingRequests: number;
  unreviewedFlagged: number;
}) {
  return (
    <div className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
      <Link
        href={ROUTES.ADMIN_REQUESTS}
        className="rounded border border-amber-watch/40 bg-amber-watch/10 p-6 transition-colors hover:bg-amber-watch/15"
      >
        <p className="text-page-title font-semibold text-amber-watch">{pendingRequests}</p>
        <p className="mt-1 text-body-lg font-medium text-ink">Pending passport requests</p>
        <p className="mt-1 text-dense text-slate">Approve or deny access requests from clinical workers.</p>
      </Link>
      <Link
        href={ROUTES.ADMIN_FLAGGED}
        className="rounded border border-alert-coral/40 bg-alert-coral/10 p-6 transition-colors hover:bg-alert-coral/15"
      >
        <p className="text-page-title font-semibold text-alert-coral">{unreviewedFlagged}</p>
        <p className="mt-1 text-body-lg font-medium text-ink">Unreviewed flagged events</p>
        <p className="mt-1 text-dense text-slate">Break-glass activations waiting for your review.</p>
      </Link>
    </div>
  );
}