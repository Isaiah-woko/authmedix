import type { Session } from "@/types";

/** GET /api/auth/session — never redirects; returns null when logged out. */
export async function getSession(): Promise<Session | null> {
  try {
    const res = await fetch("/api/auth/session", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as Session | null;
    return data && data.user ? data : null;
  } catch {
    return null; // offline / network error — treat as "no session"
  }
}

/**
 * Custom sign out that bypasses NextAuth's CSRF-protected signout route.
 * Calls our custom backend `/api/auth/logout` and hard-redirects to `/login`.
 * Used by the TopBar button and the SessionProvider's stale-cookie circuit breaker.
 */
export async function signOut(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  } catch {
    // network failed — the hard redirect below still clears UI state
  }
  if (typeof window === "undefined") return;
  
  window.location.replace("/login"); // hard reload: wipes in-memory session
}

export function redirectToLogin(): void {
  if (typeof window === "undefined") return;

  window.location.replace("/login");
}

export function redirectToSetPassword(): void {
  if (typeof window === "undefined") return;

  window.location.replace("/set-password");
}