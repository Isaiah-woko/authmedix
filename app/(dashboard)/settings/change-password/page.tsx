"use client";

/**
 * Voluntary password change (the brief's stretch item): same endpoint as the
 * forced flow, but the body includes { currentPassword, newPassword } because
 * this isn't happening right after a fresh 2FA proof. Server remains the gate.
 */

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { api, describeApiError } from "@/lib/api";
import { zodFieldErrors } from "@/lib/utils";
import { voluntaryPasswordSchema } from "@/types";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError, Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PasswordStrength } from "@/components/domain/password-strength";

export default function ChangePasswordPage() {
  const { toast } = useToast();
  const [values, setValues] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    setFieldErrors({});
    setFormError(null);

    const parsed = voluntaryPasswordSchema.safeParse(values);
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      return;
    }

    setSubmitting(true);
    const result = await api.auth.setPassword({
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
    });
    setSubmitting(false);

    if (result.ok) {
      setDone(true);
      setValues({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast({
        title: "Password changed",
        description: "Use it from your next sign-in.",
        tone: "success",
      });
      return;
    }
    setFormError(describeApiError(result));
  }

  return (
    <>
      <PageHeader
        title="Change password"
        subtitle="Choose a new password for your account. Your current session stays active."
      />
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-body">Password</CardTitle>
          <CardDescription>
            Minimum 10 characters with upper, lower, number, and symbol.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <p className="mb-4 text-body font-medium text-trust-teal">
              Password updated — it applies from your next sign-in.
            </p>
          ) : null}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
            noValidate
            className="space-y-4"
          >
            <div>
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                className="mt-1"
                value={values.currentPassword}
                onChange={(e) => setValues((v) => ({ ...v, currentPassword: e.target.value }))}
                invalid={!!fieldErrors.currentPassword}
              />
              <FieldError>{fieldErrors.currentPassword}</FieldError>
            </div>

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
              <Label htmlFor="confirmPassword">Confirm new password</Label>
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
              Change password
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}