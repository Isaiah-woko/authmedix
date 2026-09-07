import type { Session } from "@/types/session";

export function isSessionValid(session: Session | null): boolean {
  if (!session?.sessionExpiresAt) return false;
  return new Date(session.sessionExpiresAt).getTime() > Date.now();
}

export function mustChangePassword(session: Session | null): boolean {
  return session?.user.mustChangePassword === true;
}

export function isUserSuspended(session: Session | null): boolean {
  return session?.user.status === "SUSPENDED";
}