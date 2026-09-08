"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/providers/session-provider";
import { isSessionValid, mustChangePassword } from "@/lib/session";
import { ROUTES } from "@/lib/routes";
import type { Session } from "@/types/session";

/** For protected pages: no session → Login; mustChangePassword → Set Password. */
export function useRequireAuth(): { session: Session | null; isHydrated: boolean } {
  const { session, isHydrated } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isHydrated) return;
    if (!session || !isSessionValid(session)) {
      router.replace(ROUTES.LOGIN);
      return;
    }
    if (mustChangePassword(session)) {
      router.replace(ROUTES.SET_PASSWORD);
    }
  }, [isHydrated, session, router]);

  return { session, isHydrated };
}