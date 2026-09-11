"use client";

/**
 * Screen 1 — Login. Generic "invalid credentials" (never field-specific),
 * a distinct locked state with contact-your-admin copy, and calm 429 copy.
 * On success: record sentAt for the client-side 5:00 OTP countdown (HANDOFF §0).
 */

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FieldError, FieldHint, Label } from "@/components/ui/label";
import { api, describeApiError } from "@/lib/api";
import { clearPendingLogin, setPendingLogin } from "@/lib/pending-login";
import { zodFieldErrors } from "@/lib/utils";
import { isLockedBody, loginSchema } from "@/types";

export default function LoginPage() {
  const router = useRouter();
  const [values, setValues] = useState({ healthId: "", email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // An abandoned earlier attempt must never leak into a fresh one.
  useEffect(() => {
    clearPendingLogin();
  }, []);

  function setField(name: "healthId" | "email" | "password", value: string) {
    setValues((v) => ({ ...v, [name]: value }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      return;
    }

    setSubmitting(true);
    const result = await api.auth.login(parsed.data);
    setSubmitting(false);

    if (result.ok) {
      setPendingLogin({ ...parsed.data, sentAt: Date.now() });
      router.push("/otp");
      return;
    }
    if (isLockedBody(result.body)) {
      setLocked(true);
      return;
    }
    setFormError(describeApiError(result));
  }

  if (locked) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-section font-semibold text-alert-coral">Account locked</p>
          <p className="mt-2 text-body text-slate-ink">
            This account is locked after too many failed attempts. Contact your admin to
            unlock it.
          </p>
          <Button
            variant="outline"
            className="mt-6"
            onClick={() => {
              setLocked(false);
              setValues((v) => ({ ...v, password: "" }));
            }}
          >
            Try different credentials
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <p className="text-section-lg font-semibold text-deep-indigo">MediTrust</p>
        <CardTitle className="mt-2">Sign in</CardTitle>
        <CardDescription>Health ID, email, and password — then a one-time code.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div>
            <Label htmlFor="healthId">Health ID</Label>
            <Input
              id="healthId"
              mono
              placeholder="LUTH-DOC-0001"
              autoComplete="username"
              className="mt-1"
              value={values.healthId}
              onChange={(e) => setField("healthId", e.target.value)}
              invalid={!!fieldErrors.healthId}
            />
            <FieldError>{fieldErrors.healthId}</FieldError>
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="doc@luth.gov"
              autoComplete="email"
              className="mt-1"
              value={values.email}
              onChange={(e) => setField("email", e.target.value)}
              invalid={!!fieldErrors.email}
            />
            <FieldError>{fieldErrors.email}</FieldError>
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              className="mt-1"
              value={values.password}
              onChange={(e) => setField("password", e.target.value)}
              invalid={!!fieldErrors.password}
            />
            <FieldError>{fieldErrors.password}</FieldError>
          </div>

          {formError ? (
            <div role="alert">
              <FieldError>{formError}</FieldError>
            </div>
          ) : null}

          <Button type="submit" loading={submitting} className="w-full">
            Continue
          </Button>

          {process.env.NODE_ENV === "development" ? (
            <FieldHint>
              Development: your one-time code prints in the pnpm dev server console.
            </FieldHint>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}