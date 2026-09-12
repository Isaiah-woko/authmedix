"use client";

/**
 * Screen 1 — Login. Split layout: form left, product story right (desktop);
 * stacked with a compact brand header on mobile.
 *
 * Generic "invalid credentials" (never field-specific), a distinct locked
 * state with contact-your-admin copy, calm 429 copy. On success: record sentAt
 * for the client-side 5:00 OTP countdown (HANDOFF §0).
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, describeApiError } from "@/lib/api";
import { clearPendingLogin, setPendingLogin } from "@/lib/pending-login";
import { zodFieldErrors } from "@/lib/utils";
import { isLockedBody, loginSchema } from "@/types";
import { BrandMark } from "@/components/domain/brand-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError, FieldHint, Label } from "@/components/ui/label";

const PRINCIPLES = [
  {
    title: "Explicit grant",
    body: "Access exists only when an Access Passport says so, care-team assignment, an approved request, or a reasoned break-glass in an emergency.",
  },
  {
    title: "Scoped to one patient",
    body: "Never a ward, never a hospital. Being staff here grants eligibility to ask, nothing more.",
  },
  {
    title: "Time-bound, always counting down",
    body: "Fixed presets; 8h, 24h, 48h, 2h, with the expiry visible next to every action. When it expires, access ends and re-authorization is required.",
  },
];

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

  async function onSubmit() {
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

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
            {/* ── Right: the form ── */}
      <div className="flex flex-col justify-center px-4 py-10 sm:px-6 lg:order-2 lg:px-12 xl:px-20">
        <div className="mx-auto w-full max-w-md">
          {/* Compact brand header — mobile only; the panel carries it on desktop */}
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <BrandMark className="h-7 w-7" />
            <p className="text-section-lg font-semibold text-deep-indigo">MediTrust</p>
          </div>

          <h1 className="text-title font-semibold text-ink">Sign in</h1>
          <p className="mt-1 text-body text-slate-ink">
            Health ID, email, and password, then a one-time code.
          </p>

          {locked ? (
            <div className="mt-8 rounded-sm border border-alert-coral/40 border-l-4 border-l-alert-coral bg-alert-coral-soft p-4">
              <p className="text-section font-semibold text-alert-coral">Account locked</p>
              <p className="mt-1 text-body text-slate-ink">
                This account is locked after too many failed attempts. Contact your admin
                to unlock it.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setLocked(false);
                  setValues((v) => ({ ...v, password: "" }));
                }}
              >
                Try different credentials
              </Button>
            </div>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void onSubmit();
              }}
              noValidate
              className="mt-8 space-y-4"
            >
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
          )}
        </div>
      </div>
            {/* ── Left: what MediTrust is (desktop) ── */}
      <aside className="hidden flex-col justify-between bg-deep-indigo p-12 lg:flex lg:order-1 lg:border-r lg:border-white/10 xl:p-16">
        <div className="flex items-center gap-2.5">
          <BrandMark className="h-7 w-7" />
          <p className="text-section-lg font-bold text-white">MediTrust</p>
        </div>

        <div className="max-w-lg">
          <h2 className="text-title font-semibold leading-snug text-white">
            Nobody has default access to any patient. Ever.
          </h2>
          <p className="mt-3 text-body leading-relaxed text-white/75">
            Zero-trust clinical access for hospital teams. Not even staff at the
            patient&apos;s own hospital can open a record without an active, unexpired
            Access Passport for that exact patient.
          </p>

          <ul className="mt-10 space-y-7">
            {PRINCIPLES.map((principle) => (
              <li key={principle.title} className="border-l-2 border-white/15 pl-4">
                <p className="text-body font-medium text-white">{principle.title}</p>
                <p className="mt-1 text-data leading-relaxed text-white/55">{principle.body}</p>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-data text-white/45">
          Every access attempt, allowed or denied is written to a tamper-evident
          audit log.
        </p>
      </aside>
    </div>
  );
}