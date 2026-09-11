"use client";

import { useState } from "react";
import Link from "next/link";
import { BreakGlassBanner } from "@/components/access/break-glass-banner";
import { PassportPanel } from "@/components/patients/passport-panel";
import { Button } from "@/components/ui/button";
import type { NormalizedRecord, NormalizedRecordView } from "@/lib/api/patients";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatRecordType, formatRole } from "@/lib/format";
import { ROUTES } from "@/lib/routes";

function RecordRow({ record }: { record: NormalizedRecord }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="border-b border-section-line last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-paper"
      >
        <span>
          <span className="text-body font-medium text-ink">{formatRecordType(record.type)}</span>
          <span className="ml-3 text-dense text-slate">
            {record.authorName ? `${record.authorName}${record.authorRole ? ` · ${formatRole(record.authorRole as never)}` : ""}` : "System"}
          </span>
        </span>
        <span className="identifier text-dense text-slate">{formatDateTime(record.createdAt)}</span>
      </button>
      {open && (
        <p className="whitespace-pre-wrap border-t border-section-line bg-paper px-4 py-3 text-body text-ink">
          {record.content}
        </p>
      )}
    </li>
  );
}

export function PatientRecordView({
  data,
  onRenew,
  renewing,
}: {
  data: NormalizedRecordView;
  onRenew: () => void;
  renewing: boolean;
}) {
  const isBreakGlass = data.passportType === "BREAK_GLASS";

  return (
    <div className="flex flex-col gap-6">
      {isBreakGlass && data.passportExpiresAt && (
        <BreakGlassBanner expiresAt={data.passportExpiresAt} />
      )}

      <section className="rounded border border-section-line bg-white p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-section-header font-semibold text-ink">{data.patientName}</p>
          <p className="identifier text-dense text-slate">{data.patientCode}</p>
        </div>
        {data.dob && <p className="mt-1 text-body text-slate">Date of birth: {formatDate(data.dob)}</p>}
        {data.allergies && data.allergies.length > 0 && (
          <p className="mt-2 text-body text-ink">
            Allergies:{" "}
            {data.allergies.map((a) => (
              <span
                key={a}
                className="ml-1 inline-block rounded border border-alert-coral/40 bg-alert-coral/10 px-2 py-0.5 text-dense font-medium text-alert-coral"
              >
                {a}
              </span>
            ))}
          </p>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="overflow-hidden rounded border border-section-line bg-white">
          <div className="border-b border-section-line px-4 py-3">
            <p className="text-body font-medium text-ink">Records</p>
          </div>
          {data.records.length === 0 ? (
            <p className="px-4 py-6 text-body text-slate">No records recorded yet for this patient.</p>
          ) : (
            <ul>
              {data.records.map((record) => (
                <RecordRow key={record.id} record={record} />
              ))}
            </ul>
          )}
          <div className="border-t border-section-line px-4 py-3">
            <Link
              href={`${ROUTES.addDocumentation(data.patientId)}?name=${encodeURIComponent(data.patientName)}`}
            >
              <Button variant="secondary">Add documentation</Button>
            </Link>
          </div>
        </section>

        {data.passportType && data.passportExpiresAt && (
          <PassportPanel
            type={data.passportType}
            expiresAt={data.passportExpiresAt}
            renewalCount={data.renewalCount}
            canRenew={Boolean(data.passportId) && !isBreakGlass}
            onRenew={onRenew}
            renewing={renewing}
          />
        )}
      </div>
    </div>
  );
}