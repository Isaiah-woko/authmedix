"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/providers/session-provider";
import { isSessionValid, mustChangePassword } from "@/lib/session";
import { ROUTES } from "@/lib/routes";

/** For Login/OTP: an authenticated worker has no business here. */
export function useRedirectIfAuthenticated(): void {
  const { session, isHydrated } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isHydrated) return;
    if (session && isSessionValid(session)) {
      router.replace(mustChangePassword(session) ? ROUTES.SET_PASSWORD : ROUTES.DASHBOARD);
    }
  }, [isHydrated, session, router]);
}