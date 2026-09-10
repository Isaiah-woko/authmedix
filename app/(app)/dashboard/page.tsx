"use client";

import { useEffect, useState } from "react";
import { AdminQueueCounters } from "@/components/dashboard/admin-queue-counters";
import { ActivePassportTable } from "@/components/dashboard/active-passport-table";
import { PageHeader } from "@/components/layout/page-header";
import { getFlaggedEvents, getPassportRequests } from "@/lib/api";
import { getMyActivePassports } from "@/lib/api/passports";
import { isClinicalRole } from "@/lib/roles";
import { useSession } from "@/providers/session-provider";
import type { ActivePassportRow } from "@/lib/api/passports";

export default function DashboardPage() {
  const { session } = useSession();
const [passports, setPassports] = useState<ActivePassportRow[] | null>(null);  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [flaggedCount, setFlaggedCount] = useState<number | null>(null);

  const role = session?.user.role;
  const clinical = role ? isClinicalRole(role) : false;

  useEffect(() => {
    if (!role) return;
    if (isClinicalRole(role)) {
      getMyActivePassports()
        .then(setPassports)
        .catch(() => setPassports([]));
    } else {
      Promise.all([getPassportRequests("pending"), getFlaggedEvents()])
        .then(([requests, flagged]) => {
          setPendingCount(requests.length);
          setFlaggedCount(flagged.length);
        })
        .catch(() => {
          setPendingCount(0);
          setFlaggedCount(0);
        });
    }
  }, [role]);

  if (!session) return null;

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={
          clinical
            ? "Patients you currently hold an active access passport for."
            : "Your two working queues."
        }
      />
      {clinical ? (
        passports === null ? (
          <p className="text-body text-slate">Loading your assigned patients…</p>
        ) : passports.length === 0 ? (
          <section className="max-w-lg rounded border border-section-line bg-white p-6">
            <p className="text-body-lg font-medium text-ink">No patients currently assigned to you</p>
            <p className="mt-1 text-body text-slate">
              This is normal at the start of a shift. Patients appear here only while you hold an
              active, unexpired access passport for them.
            </p>
          </section>
        ) : (
          <ActivePassportTable passports={passports} />
        )
      ) : pendingCount === null || flaggedCount === null ? (
        <p className="text-body text-slate">Loading your queues…</p>
      ) : (
        <AdminQueueCounters pendingRequests={pendingCount} unreviewedFlagged={flaggedCount} />
      )}
    </>
  );
}