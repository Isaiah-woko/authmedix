"use client";

/**
 * Client-side role gate for route groups — UX clarity only.
 * The backend remains the security boundary: every admin API returns 403 to
 * non-Admins regardless of what the UI shows (HANDOFF §7). Never treat this
 * component as protection.
 *
 * Uses router.replace (not redirect) — we're in a client effect, and
 * redirect() throws an error that nothing would catch here.
 */

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/use-session";
import { isClinicalRole } from "@/types";

export function RoleGate({
  allow,
  children,
}: {
  allow: "ADMIN" | "CLINICAL" | "ALL";
  children: ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading } = useSession();

  const allowed =
    allow === "ALL" ||
    (user !== null &&
      (allow === "ADMIN" ? user.role === "ADMIN" : isClinicalRole(user.role)));

  useEffect(() => {
    if (!isLoading && user !== null && !allowed) {
      router.replace("/");
    }
  }, [isLoading, user, allowed, router]);

  // SessionProvider owns the unauthenticated redirect; here we just hold
  // the chrome back until the role is known (no wrong-role flash).
  if (isLoading || user === null) return null;
  if (!allowed) return null;
  return <>{children}</>;
}