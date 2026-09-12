"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { getAuditLog, type AuditLogRow } from "@/lib/api/admin";
import { formatDateTime } from "@/lib/dates";

export default function AuditLogPage() {
  const [rows, setRows] = useState<AuditLogRow[] | null>(null);
  const [actionFilter, setActionFilter] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState("");

  useEffect(() => {
    getAuditLog()
      .then(setRows)
      .catch(() => setRows([]));
  }, []);

  const actions = useMemo(
    () => Array.from(new Set((rows ?? []).map((r) => r.action))).sort(),
    [rows]
  );

  const filtered = (rows ?? []).filter(
    (r) =>
      (!actionFilter || r.action === actionFilter) &&
      (!outcomeFilter || r.outcome === outcomeFilter)
  );

  return (
    <>
      <PageHeader title="Audit Log" subtitle="Every access decision, allow or deny, in one trail." />

      <div className="mb-4 flex flex-wrap gap-3">
        <div>
          <label className="text-dense text-slate" htmlFor="actionFilter">
            Action
          </label>
          <select
            id="actionFilter"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="mt-1 block rounded border border-section-line bg-white px-3 py-1.5 text-body focus:outline-none focus:ring-2 focus:ring-deep-indigo/30"
          >
            <option value="">All actions</option>
            {actions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-dense text-slate" htmlFor="outcomeFilter">
            Outcome
          </label>
          <select
            id="outcomeFilter"
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value)}
            className="mt-1 block rounded border border-section-line bg-white px-3 py-1.5 text-body focus:outline-none focus:ring-2 focus:ring-deep-indigo/30"
          >
            <option value="">All outcomes</option>
            <option value="ALLOWED">Allowed</option>
            <option value="DENIED">Denied</option>
          </select>
        </div>
      </div>

      {rows === null ? (
        <p className="text-body text-slate">Loading audit log…</p>
      ) : filtered.length === 0 ? (
        <section className="max-w-lg rounded border border-section-line bg-white p-6">
          <p className="text-body-lg font-medium text-ink">No audit rows match these filters</p>
          <p className="mt-1 text-body text-slate">Clear the filters to see the full trail.</p>
        </section>
      ) : (
        <section className="overflow-hidden rounded border border-section-line bg-white">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-section-line">
                <th className="px-4 py-3 text-body font-medium text-slate">When</th>
                <th className="px-4 py-3 text-body font-medium text-slate">User</th>
                <th className="px-4 py-3 text-body font-medium text-slate">Patient</th>
                <th className="px-4 py-3 text-body font-medium text-slate">Action</th>
                <th className="px-4 py-3 text-body font-medium text-slate">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-b border-section-line last:border-0">
                  <td className="identifier px-4 py-3 text-dense text-slate">
                    {formatDateTime(row.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-body text-ink">{row.userName ?? "System"}</p>
                    <p className="identifier text-dense text-slate">{row.userHealthId}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-body text-ink">{row.patientName ?? "—"}</p>
                    <p className="identifier text-dense text-slate">{row.patientCode}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-body text-ink">{row.action}</p>
                    {row.flagged && (
                      <span className="mt-0.5 inline-block rounded border border-alert-coral/40 bg-alert-coral/10 px-2 py-0.5 text-dense font-medium text-alert-coral">
                        Flagged
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded border px-2 py-0.5 text-dense font-medium ${
                        row.outcome === "ALLOWED"
                          ? "border-trust-teal/40 bg-trust-teal/10 text-trust-teal"
                          : "border-alert-coral/40 bg-alert-coral/10 text-alert-coral"
                      }`}
                    >
                      {row.outcome === "ALLOWED" ? "Allowed" : "Denied"}
                    </span>
                    {row.reason && <p className="mt-0.5 text-dense text-slate">{row.reason}</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}