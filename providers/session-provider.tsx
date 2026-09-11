"use client";

/**
 * Client-side session context (HANDOFF §1).
 *
 * - Reads the session from GET /api/auth/session (cookie is HttpOnly — we can
 *   never parse it in JS).
 * - Route gates mirror the server middleware as a second line: no session →
 *   /login; mustChangePassword → /set-password; logged-in users are pushed off
 *   the auth screens.
 * - Proactively logs out when `user.sessionExpiresAt` passes — no silent
 *   refresh, that's the product (continuous re-verification).
 *
 * IMPORTANT: the root layout persists across client navigations, so this
 * provider does NOT remount between pages. Auth screens must call refresh()
 * after a successful transition (verify-code, set-password).
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
import { getSession, redirectToLogin, redirectToSetPassword } from "@/lib/auth-client";

export interface SessionContextValue {
  session: Session | null;
  user: SessionUser | null;
  isLoading: boolean;
  /** Re-fetch after auth transitions. See the note above. */
  refresh: () => Promise<void>;
}

export const SessionContext = createContext<SessionContextValue | null>(null);

/** Screens reachable without a session. /set-password is NOT here —
 *  it requires a session (it follows verify-code). */
const PUBLIC_PATHS = new Set(["/login", "/otp"]);

export function SessionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /** Manual re-fetch — called from event handlers after auth transitions
   *  (verify-code, set-password). Never called from an effect. */
  const refresh = useCallback(async () => {
    const next = await getSession();
    setSession(next);
    setIsLoading(false);
  }, []);

  // Initial load — inline async run so every setState happens after the first
  // await (React: no synchronous setState in effects). The stale guard ignores
  // a response that lands after unmount.
  useEffect(() => {
    let active = true;

    async function run() {
      const next = await getSession(); // await FIRST — no sync setState
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
      if (!PUBLIC_PATHS.has(pathname)) redirectToLogin();
      return;
    }

    if (PUBLIC_PATHS.has(pathname)) {
      if (mustChange) redirectToSetPassword();
      else window.location.assign("/");
      return;
    }

    if (mustChange && pathname !== "/set-password") {
      redirectToSetPassword();
    }
  }, [session, isLoading, pathname]);

  // ── Proactive clinical-session expiry check (role-based TTL, server-set) ──
  useEffect(() => {
    if (!session) return;
    const expiresAt = new Date(session.user.sessionExpiresAt).getTime();
    const check = () => {
      if (Date.now() >= expiresAt) redirectToLogin();
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