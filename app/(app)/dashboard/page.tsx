"use client";

import { PageHeader } from "@/components/layout/page-header";
import { formatRole } from "@/lib/format";
import { useSession } from "@/providers/session-provider";

export default function DashboardPage() {
  const { session } = useSession();
  if (!session) return null;

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`Signed in as ${formatRole(session.user.role)}; this is your working view.`}
      />
      <section className="max-w-lg rounded border border-section-line bg-white p-6">
        <p className="text-body text-slate">
          The real dashboard arrives in Phase 4: for clinical roles, an empty-by-default list of
          patients with active passports; for Admin, the two working-queue counters (pending
          requests in amber, unreviewed flagged events in coral).
        </p>
      </section>
    </>
  );
}