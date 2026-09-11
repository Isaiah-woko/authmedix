"use client";

/**
 * Clinical dashboard feed — only currently-valid passports, soonest expiry
 * first (HANDOFF §3.7). Empty is a normal, calm state.
 *
 * Effect setState happens only after the first await; refetch sets loading
 * from event-handler context. (React: no synchronous setState in effects.)
 */

import { useCallback, useEffect, useState } from "react";
import { api, describeApiError } from "@/lib/api";
import type { MyPassport } from "@/types";

export function useMyPassports() {
  const [passports, setPassports] = useState<MyPassport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function run() {
      const result = await api.passports.mine(); // await FIRST — no sync setState
      if (!active) return;
      if (result.ok) setPassports(result.data);
      else setError(describeApiError(result));
      setIsLoading(false);
    }

    void run();
    return () => {
      active = false;
    };
  }, []);

  const refetch = useCallback(async () => {
    setIsLoading(true); // event-handler context — allowed
    setError(null);
    const result = await api.passports.mine();
    if (result.ok) setPassports(result.data);
    else setError(describeApiError(result));
    setIsLoading(false);
  }, []);

  return { passports, isLoading, error, refetch };
}