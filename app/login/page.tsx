"use client";

import { AuthLayout } from "@/components/layout/auth-layout";
import { LoginForm } from "@/components/auth/login-form";
import { useRedirectIfAuthenticated } from "@/hooks/use-redirect-if-authenticated";
import { useSession } from "@/providers/session-provider";

export default function LoginPage() {
  useRedirectIfAuthenticated();
  const { isHydrated } = useSession();
  if (!isHydrated) return null;

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Health ID, email and password then a one-time code."
    >
      <LoginForm />
    </AuthLayout>
  );
}