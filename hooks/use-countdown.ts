"use client";

import { useEffect, useState } from "react";
import { getTimeRemaining } from "@/lib/dates";
import type { TimeRemaining } from "@/lib/dates";

/** Ticks once per second toward an ISO deadline. Null when no deadline. */
export function useCountdown(targetIso: string | null): TimeRemaining | null {
  const [remaining, setRemaining] = useState<TimeRemaining | null>(() =>
    targetIso ? getTimeRemaining(targetIso) : null
  );

  useEffect(() => {
    if (!targetIso) {
      setRemaining(null);
      return;
    }
    setRemaining(getTimeRemaining(targetIso));
    const id = setInterval(() => setRemaining(getTimeRemaining(targetIso)), 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  return remaining;
}