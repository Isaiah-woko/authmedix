"use client";

/**
 * Admin dashboard counters (HANDOFF §3.10). pendingRequests (Amber) and
 * unreviewedFlagged (Coral) are Admin's two working queues.
 * Same effect-safety pattern as useMyPassports.
 */

import { useCallback, useEffect, useState } from "react";
import { api, describeApiError } from "@/lib/api";
import type { AdminStats } from "@/types";

export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function run() {
      const result = await api.admin.stats(); // await FIRST — no sync setState
      if (!active) return;
      if (result.ok) setStats(result.data);
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
    const result = await api.admin.stats();
    if (result.ok) setStats(result.data);
    else setError(describeApiError(result));
    setIsLoading(false);
  }, []);

  return { stats, isLoading, error, refetch };
}