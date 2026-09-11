"use client";

/**
 * Client-side role gate for route groups — UX clarity only.
 * The backend remains the security boundary: every admin API returns 403 to
 * non-Admins regardless of what the UI shows (HANDOFF §7). Never treat this
 * component as protection.
 */

import { useEffect, type ReactNode } from "react";
import { useSession } from "@/hooks/use-session";
import { isClinicalRole } from "@/types";
import { redirect } from "next/navigation";

export function RoleGate({
  allow,
  children,
}: {
  allow: "ADMIN" | "CLINICAL" | "ALL";
  children: ReactNode;
}) {
  const { user, isLoading } = useSession();

  const allowed =
    allow === "ALL" ||
    (user !== null &&
      (allow === "ADMIN" ? user.role === "ADMIN" : isClinicalRole(user.role)));

  useEffect(() => {
    if (!isLoading && user !== null && !allowed) {
      redirect("/");
    }
  }, [isLoading, user, allowed]);

  // SessionProvider owns the unauthenticated redirect; here we just hold
  // the chrome back until the role is known (no wrong-role flash).
  if (isLoading || user === null) return null;
  if (!allowed) return null;
  return <>{children}</>;
}