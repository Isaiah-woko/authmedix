"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@/types/session";

interface SessionContextValue {
  session: Session | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/** Session lives in the HttpOnly cookie. This provider only mirrors it into React state. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", { credentials: "same-origin" });
      if (res.ok) {
        setSession((await res.json()) as Session);
      } else {
        setSession(null);
      }
    } catch {
      setSession(null);
    }
  }, []);

  // Initial load. Every state update lives inside a promise callback,
  // never synchronously in the effect body, so no cascading renders.
  useEffect(() => {
    let alive = true;
    fetch("/api/auth/session", { credentials: "same-origin" })
      .then((res) => (res.ok ? res.json() : Promise.resolve(null)))
      .then((data) => {
        if (!alive) return;
        setSession((data ?? null) as Session | null);
        setLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setSession(null);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/signout", { method: "POST", credentials: "same-origin" }).catch(
      () => undefined
    );
    setSession(null);
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
  }, []);

  const value = useMemo(
    () => ({ session, loading, refresh, signOut }),
    [session, loading, refresh, signOut]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}