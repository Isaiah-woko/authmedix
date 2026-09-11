"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/providers/session-provider";

export function useRequireAuth() {
  const { session, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    if (session.user.mustChangePassword && window.location.pathname !== "/set-password") {
      router.replace("/set-password");
    }
  }, [session, loading, router]);

  return { session, loading, isHydrated: !loading };
}