"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/layout/auth-layout";
import { OtpForm } from "@/components/auth/otp-form";
import { useRedirectIfAuthenticated } from "@/hooks/use-redirect-if-authenticated";
import { useSession } from "@/providers/session-provider";
import { readCodeExpiry } from "@/lib/session";
import { ROUTES } from "@/lib/routes";

export default function OtpPage() {
  useRedirectIfAuthenticated();
  const { isHydrated } = useSession();
  const router = useRouter();
  const [hasPendingLogin] = useState(() => readCodeExpiry() !== null);

  useEffect(() => {
    if (isHydrated && !hasPendingLogin) {
      router.replace(ROUTES.LOGIN);
    }
  }, [isHydrated, hasPendingLogin, router]);

  if (!isHydrated || !hasPendingLogin) return null;

  return (
    <AuthLayout
      title="Verify your identity"
      subtitle="A 6-digit code was sent to your registered device."
    >
      <OtpForm />
    </AuthLayout>
  );
}