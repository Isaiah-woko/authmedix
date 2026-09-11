"use client";

/**
 * Screen 3 — Set Your Password. The only reachable screen while
 * mustChangePassword is true (server-enforced; SessionProvider mirrors it).
 * Forced mode: { newPassword } only — identity was just proven via
 * Health ID + temp password + OTP. On success the new Set-Cookie applies
 * automatically; refresh() then route to Dashboard.
 */

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PasswordStrength } from "@/components/domain/password-strength";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FieldError, Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/hooks/use-session";
import { api, describeApiError } from "@/lib/api";
import { zodFieldErrors } from "@/lib/utils";
import { setPasswordSchema } from "@/types";

export default function SetPasswordPage() {
  const router = useRouter();
  const { user, isLoading, refresh } = useSession();
  const [values, setValues] = useState({ newPassword: "", confirmPassword: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reached with mustChangePassword already false? Nothing to do here.
  useEffect(() => {
    if (user && !user.mustChangePassword) router.replace("/");
  }, [user, router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const parsed = setPasswordSchema.safeParse(values);
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      return;
    }

    setSubmitting(true);
    const result = await api.auth.setPassword({ newPassword: parsed.data.newPassword });
    setSubmitting(false);

    if (result.ok) {
      await refresh(); // pick up mustChangePassword: false + new cookie
      router.replace("/");
      return;
    }
    setFormError(describeApiError(result));
  }

  if (isLoading || !user) {
    return (
      <Card>
        <CardContent className="space-y-4 py-8">
          <Skeleton className="h-6 w-48 mx-auto" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!user.mustChangePassword) return null; // redirect in flight

  return (
    <Card>
      <CardHeader>
        <p className="text-section-lg font-semibold text-deep-indigo">MediTrust</p>
        <CardTitle className="mt-2">Set your password</CardTitle>
        <CardDescription>
          Your admin issued a temporary password. Choose your own to continue — this is
          the only screen reachable until you do.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div>
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              className="mt-1"
              value={values.newPassword}
              onChange={(e) => setValues((v) => ({ ...v, newPassword: e.target.value }))}
              invalid={!!fieldErrors.newPassword}
            />
            <PasswordStrength password={values.newPassword} />
            <FieldError>{fieldErrors.newPassword}</FieldError>
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              className="mt-1"
              value={values.confirmPassword}
              onChange={(e) => setValues((v) => ({ ...v, confirmPassword: e.target.value }))}
              invalid={!!fieldErrors.confirmPassword}
            />
            <FieldError>{fieldErrors.confirmPassword}</FieldError>
          </div>

          {formError ? (
            <div role="alert">
              <FieldError>{formError}</FieldError>
            </div>
          ) : null}

          <Button type="submit" loading={submitting} className="w-full">
            Set password and continue
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}