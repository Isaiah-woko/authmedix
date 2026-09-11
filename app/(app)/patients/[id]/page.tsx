"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { NoAccessState } from "@/components/patients/no-access-state";
import { PatientRecordView } from "@/components/patients/patient-record-view";
import { ApiClientError, getPatient, renewPassport } from "@/lib/api";
import type { NormalizedRecordView } from "@/lib/api/patients";
import { denyReasonToState } from "@/lib/access";
import type { DenyState } from "@/lib/access";
import type { PatientIdentity } from "@/types/patient";

export default function PatientRecordPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const patientId = params.id;

  const [data, setData] = useState<NormalizedRecordView | null>(null);
  const [denied, setDenied] = useState<{
    state: DenyState;
    patient: PatientIdentity | null;
  } | null>(null);
  const [renewing, setRenewing] = useState(false);

  const loading = data === null && denied === null;

  const load = useCallback(() => {
    return getPatient(patientId)
      .then((result) => {
        setData(result);
        setDenied(null);
      })
      .catch((err: unknown) => {
        const error = err as ApiClientError;
        const name = searchParams.get("name");
        const identity: PatientIdentity | null = name
          ? {
              id: patientId,
              name,
              patientCode: searchParams.get("code") ?? "",
            }
          : null;
        if (error.status === 403) {
          setDenied({ state: denyReasonToState(error.reason), patient: identity });
        } else {
          setDenied({ state: "NO_PASSPORT", patient: identity });
        }
        setData(null);
      });
  }, [patientId, searchParams]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRenew() {
    if (!data?.passportId) return;
    setRenewing(true);
    try {
      await renewPassport(data.passportId);
      await load();
    } finally {
      setRenewing(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Patient Record"
        subtitle="Access is resolved per worker and patient on every visit."
      />
      {loading ? (
        <p className="text-body text-slate">Resolving access for this patient…</p>
      ) : denied ? (
        <NoAccessState state={denied.state} patient={denied.patient} />
      ) : data ? (
        <PatientRecordView data={data} onRenew={handleRenew} renewing={renewing} />
      ) : null}
    </>
  );
}