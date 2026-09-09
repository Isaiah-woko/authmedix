"use client";

import { useState } from "react";
import Link from "next/link";
import { BreakGlassBanner } from "@/components/access/break-glass-banner";
import { PassportPanel } from "@/components/patients/passport-panel";
import { Button } from "@/components/ui/button";
import type { PatientRecordView as RecordViewData } from "@/lib/api/patients";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatRecordType, formatRole } from "@/lib/format";
import { ROUTES } from "@/lib/routes";

/** The with-access state. Records arrive pre-filtered server-side: render what we are given. */
export function PatientRecordView({
  data,
  onRenew,
  renewing,
}: {
  data: RecordViewData;
  onRenew: () => void;
  renewing: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(data.records[0]?.id ?? null);
  const isBreakGlass = data.passport.type === "BREAK_GLASS";

  return (
    <>
      {isBreakGlass ? <BreakGlassBanner expiresAt={data.passport.expiresAt} /> : null}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <section className="rounded border border-section-line bg-white p-6">
            <p className="text-section-header font-semibold text-ink">{data.patient.name}</p>
            <p className="identifier mt-1 text-dense text-slate">{data.patient.patientCode}</p>
            <p className="mt-1 text-dense text-slate">
              Date of birth: {data.patient.dob ? formatDate(data.patient.dob) : "Unknown"}
            </p>
            {data.patient.allergies && data.patient.allergies.length > 0 ? (
              <p className="mt-3 text-body text-ink">
                Allergies:{" "}
                <span className="font-medium text-alert-coral">{data.patient.allergies.join(", ")}</span>
              </p>
            ) : null}
          </section>

          <section className="mt-6 rounded border border-section-line bg-white">
            <div className="flex items-center justify-between border-b border-section-line px-4 py-3">
              <p className="text-body font-medium text-ink">Records</p>
              <Link href={ROUTES.addDocumentation(data.patient.id)}>
                <Button variant="secondary">Add documentation</Button>
              </Link>
            </div>
            {data.records.length === 0 ? (
              <p className="px-4 py-6 text-body text-slate">
                No records recorded yet for this patient.
              </p>
            ) : (
              <ul>
                {data.records.map((record) => (
                  <li key={record.id} className="border-b border-section-line last:border-0">
                    <button
                      type="button"
                      onClick={() => setSelectedId(record.id === selectedId ? null : record.id)}
                      className={`w-full px-4 py-3 text-left transition-colors ${
                        selectedId === record.id ? "bg-paper" : "hover:bg-paper"
                      }`}
                    >
                      <span className="flex items-center justify-between">
                        <span className="text-body font-medium text-ink">
                          {formatRecordType(record.type)}
                        </span>
                        <span className="text-dense text-slate">{formatDateTime(record.createdAt)}</span>
                      </span>
                      <span className="mt-0.5 block text-dense text-slate">
                        {record.authorName}
                        {record.authorRole ? ` · ${formatRole(record.authorRole)}` : ""}
                      </span>
                    </button>
                    {selectedId === record.id ? (
                      <div className="border-t border-section-line bg-paper px-4 py-3">
                        <p className="text-body text-ink">{record.content}</p>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <div>
          <PassportPanel passport={data.passport} onRenew={onRenew} renewing={renewing} />
        </div>
      </div>
    </>
  );
}