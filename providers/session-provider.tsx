"use client";

/**
 * Client-side session context (HANDOFF §1) with loop circuit breakers.
 *
 * - Session fetches are deduped module-wide: a remount storm (StrictMode, HMR,
 *   redirect reloads) cannot produce a polling stream.
 * - Every client redirect goes through safeRedirect(): max 2 redirects per 10s
 *   per tab (sessionStorage survives page reloads). A third means we're in a
 *   redirect loop (stale cookie vs server gate, proxy bouncing, etc.) — we stop
 *   navigating and clear the session instead of flashing forever.
 */

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import type { Session, SessionUser } from "@/types";
import { getSession, signOut } from "@/lib/auth-client";

export interface SessionContextValue {
  session: Session | null;
  user: SessionUser | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

export const SessionContext = createContext<SessionContextValue | null>(null);

/** Screens reachable without a session. /set-password is NOT here — it
 *  requires a session (it follows verify-code). */
const PUBLIC_PATHS = new Set(["/login", "/otp", "/setup"]);

/* ── Fetch dedupe: survives remounts within one page instance ── */
let sessionFetch: { at: number; promise: Promise<Session | null> } | null = null;

function getSessionDeduped(): Promise<Session | null> {
  const now = Date.now();
  if (sessionFetch && now - sessionFetch.at < 2000) return sessionFetch.promise;
  const promise = getSession();
  sessionFetch = { at: now, promise };
  return promise;
}

/* ── Redirect circuit breaker: survives full page reloads via sessionStorage ── */
const REDIRECT_LOG_KEY = "meditrust.redirect-log";

function safeRedirect(target: string): boolean {
  if (typeof window === "undefined") return false;
  const now = Date.now();
  let log: number[] = [];
  try {
    log = JSON.parse(window.sessionStorage.getItem(REDIRECT_LOG_KEY) ?? "[]") as number[];
  } catch {
    log = [];
  }
  log = log.filter((t) => now - t < 10_000);
  if (log.length >= 2) return false; // loop detected — stay put
    log.push(now);
  window.sessionStorage.setItem(REDIRECT_LOG_KEY, JSON.stringify(log));
  window.location.replace(target); // must not throw — called from setInterval
  return true;

}

export function SessionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const next = await getSessionDeduped();
    setSession(next);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let active = true;

    async function run() {
      const next = await getSessionDeduped(); // await FIRST
      if (!active) return;
      setSession(next);
      setIsLoading(false);
    }

    void run();
    return () => {
      active = false;
    };
  }, []);

  // ── Route gating (client-side mirror of the server middleware) ──
  useEffect(() => {
    if (isLoading) return;
    const mustChange = session?.user.mustChangePassword === true;

    if (!session) {
      // No session on a protected path → redirect to login
      if (!PUBLIC_PATHS.has(pathname)) safeRedirect("/login");
      return;
    }

    // We have a session. Two cases:
    if (PUBLIC_PATHS.has(pathname)) {
      // On an auth screen (login/otp): only redirect if mustChangePassword
      if (mustChange) {
        if (!safeRedirect("/set-password")) void signOut();
      }
      // Otherwise: stay put. If the cookie is stale, middleware will handle it.
      // DO NOT redirect to "/" from here — that creates a loop if middleware bounces back.
      return;
    }

    // On a protected path with mustChangePassword → force to set-password
    if (mustChange && pathname !== "/set-password") {
      if (!safeRedirect("/set-password")) void signOut();
    }
  }, [session, isLoading, pathname]);

  // ── Proactive clinical-session expiry check (role-based TTL, server-set) ──
  useEffect(() => {
    if (!session) return;
    const expiresAt = new Date(session.user.sessionExpiresAt).getTime();
    const check = () => {
      if (Date.now() >= expiresAt) safeRedirect("/login");
    };
    check();
    const id = setInterval(check, 15_000);
    return () => clearInterval(id);
  }, [session]);

  const value = useMemo(
    () => ({ session, user: session?.user ?? null, isLoading, refresh }),
    [session, isLoading, refresh]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}