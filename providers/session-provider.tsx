"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { USE_MOCKS } from "@/lib/flags";
import type { Session } from "@/types/session";

const STORAGE_KEY = "meditrust.mock.session";

interface SessionContextValue {
  session: Session | null;
  setSession: (s: Session | null) => void;
  clearSession: () => void;
  isHydrated: boolean;
}

const SessionContext = createContext<SessionContextValue>({
  session: null,
  setSession: () => {},
  clearSession: () => {},
  isHydrated: false,
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // MOCK MODE ONLY: revive session across refreshes.
    // Real mode will rely on the httpOnly cookie / NextAuth instead.
    if (USE_MOCKS) {
      try {
        const raw = window.sessionStorage.getItem(STORAGE_KEY);
        if (raw) setSessionState(JSON.parse(raw) as Session);
      } catch {
        /* corrupt storage — ignore */
      }
    }
    setIsHydrated(true);
  }, []);

  const setSession = useCallback((s: Session | null) => {
    setSessionState(s);
    if (USE_MOCKS) {
      if (s) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      else window.sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const clearSession = useCallback(() => setSession(null), [setSession]);

  const value = useMemo(
    () => ({ session, setSession, clearSession, isHydrated }),
    [session, setSession, clearSession, isHydrated]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}