"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/layout/auth-layout";
import { SetPasswordForm } from "@/components/auth/set-password-form";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { ROUTES } from "@/lib/routes";

export default function SetPasswordPage() {
  const { session, isHydrated } = useRequireAuth();
  const router = useRouter();

  // Already changed? This screen is not for you.
  useEffect(() => {
    if (session && !session.user.mustChangePassword) {
      router.replace(ROUTES.DASHBOARD);
    }
  }, [session, router]);

  if (!isHydrated || !session || !session.user.mustChangePassword) return null;

  return (
    <AuthLayout
      title="Set your password"
      subtitle="First login (or forced reset): choose a new password that meets the strength rule."
    >
      <SetPasswordForm />
    </AuthLayout>
  );
}