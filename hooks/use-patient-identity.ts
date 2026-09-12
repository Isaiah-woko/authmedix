"use client";

/**
 * Identity-only lookup for headers/banners on patient-scoped screens.
 * Name/code are NOT access-gated (search is identity-only for any session),
 * so resolving them leaks nothing clinical (HANDOFF §2).
 * Effect is await-first: zero synchronous setState.
 */

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { PatientSearchResult } from "@/types";

export function usePatientIdentity(patientId: string | null | undefined) {
  const [identity, setIdentity] = useState<PatientSearchResult | null>(null);

  useEffect(() => {
    if (!patientId) return;
    let active = true;

    async function load() {
      const result = await api.patients.search(); // await FIRST
      if (!active) return;
      setIdentity(result.ok ? (result.data.find((p) => p.id === patientId) ?? null) : null);
    }

    void load();
    return () => {
      active = false;
    };
  }, [patientId]);

  return identity;
}