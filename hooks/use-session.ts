"use client";

import { useContext } from "react";
import { SessionContext, type SessionContextValue } from "@/providers/session-provider";

/** Typed session context — throws if used outside <SessionProvider>. */
export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}

/** Convenience: null-safe current user. */
export function useCurrentUser() {
  return useSession().user;
}

/** Role gate for UI decisions only — the backend is the real boundary. */
export function useIsAdmin(): boolean {
  return useSession().user?.role === "ADMIN";
}