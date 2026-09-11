/**
 * Client-side session helpers.
 *
 * The session cookie (`meditrust.session-token`) is HttpOnly — we can never
 * read or parse it in JS (HANDOFF §6). Everything goes through the backend's
 * session endpoints instead.
 *
 * This module deliberately uses raw fetch (not lib/api.ts) for its own two
 * endpoints, for two reasons:
 *  - GET /api/auth/session must be SILENT: a 401 here just means "logged out"
 *    and must never trigger the global logout-redirect loop.
 *  - POST /api/auth/signout must not run through the error dispatcher.
 * It also keeps the dependency one-way (api.ts → auth-client.ts), so no cycles.
 */

import type { Session } from "@/types";
import { redirect } from 'next/navigation'

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

/** POST /api/auth/signout, then land on /login. */
export async function signOut(): Promise<void> {
  try {
    await fetch("/api/auth/signout", { method: "POST", credentials: "include" });
  } finally {
    redirectToLogin();
  }
}

let navigating = false;

/** Full-logout redirect (HANDOFF §1: no silent refresh — that's the product). */
export function redirectToLogin(): void {
  if (typeof window === "undefined" || navigating) return;
  navigating = true;
  redirect("/login");
}

/** The mustChangePassword gate (HANDOFF §1): only reachable screen while true. */
export function redirectToSetPassword(): void {
  if (typeof window === "undefined" || navigating) return;
  navigating = true;
  redirect("/set-password");
}