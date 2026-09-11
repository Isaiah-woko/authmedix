"use client";

/**
 * THE zero-trust fetch (Screen 6). Resolves GET /api/patients/:id into the
 * discriminated state the record view renders (HANDOFF §4):
 *   allowed → role-filtered payload, render as-is
 *   denied  → exact reason string picks the no-access copy
 *   not_found / error → distinct handling
 * 401 and password_change_required are handled globally by lib/api.ts.
 *
 * Loading is DERIVED during render (not set synchronously in an effect): when
 * patientId changes, isLoading is immediately true because the cached result
 * no longer matches the id. This satisfies React's no-sync-setState-in-effect
 * rule while keeping stale-data flashes impossible.
 */

import { useCallback, useEffect, useState } from "react";
import { api, describeApiError } from "@/lib/api";
import { isPatientAccessError, type PatientAccessResult } from "@/types";

export type PatientAccessState =
  | PatientAccessResult
  | { status: "error"; message: string };

interface LoadedResult {
  patientId: string;
  state: PatientAccessState;
}

function mapResult(
  result: Awaited<ReturnType<typeof api.patients.view>>
): PatientAccessState {
  if (result.ok) return { status: "allowed", data: result.data };
  if (result.status === 403 && isPatientAccessError(result.body)) {
    return { status: "denied", reason: result.body.reason };
  }
  if (result.status === 404) return { status: "not_found" };
  return { status: "error", message: describeApiError(result) };
}

export function usePatientAccess(patientId: string | null | undefined) {
  const [loaded, setLoaded] = useState<LoadedResult | null>(null);
  const [isRefetching, setIsRefetching] = useState(false);

  const isLoading =
    patientId != null &&
    (loaded === null || loaded.patientId !== patientId || isRefetching);

  useEffect(() => {
    if (!patientId) return;
    let active = true;

    async function run() {
      const result = await api.patients.view(patientId as string); // await FIRST
      if (!active) return;
      setLoaded({ patientId: patientId as string, state: mapResult(result) });
    }

    void run();
    return () => {
      active = false;
    };
  }, [patientId]);

  const refetch = useCallback(async () => {
    if (!patientId) return;
    setIsRefetching(true); // event-handler context — allowed
    const result = await api.patients.view(patientId);
    setLoaded({ patientId, state: mapResult(result) });
    setIsRefetching(false);
  }, [patientId]);

  const state =
    loaded !== null && patientId != null && loaded.patientId === patientId
      ? loaded.state
      : null;

  return { state, isLoading, refetch };
}