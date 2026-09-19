"use client";

/**
 * First-run system setup — creates the first hospital + first admin account
 * on an empty system. Public, one-time only: POST /api/bootstrap permanently
 * disables itself after success; GET /api/bootstrap/status gates the form.
 *
 * - Never flashes the form before the status check resolves.
 * - Authenticated visitors are sent straight to their dashboard.
 * - 403 on submit is the race guard (someone else finished setup first).
 * - No session is issued: the new admin logs in via the normal 2-step flow.
 * - Passwords live only in form state and are wiped on success.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy } from "lucide-react";
import { z } from "zod";
import { useSession } from "@/hooks/use-session";
import { zodFieldErrors } from "@/lib/utils";
import { newPasswordSchema } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldError, FieldHint, Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PasswordStrength } from "@/components/domain/password-strength";

type Phase = "checking" | "form" | "success" | "already-initialized";

const setupSchema = z
  .object({
    hospitalName: z.string().trim().min(2, "Hospital name must be at least 2 characters."),
    hospitalCode: z
      .string()
      .trim()
      .min(2, "Code must be 2–10 characters.")
      .max(10, "Code must be 2–10 characters.")
      .regex(/^[A-Za-z0-9-]+$/, "Letters, numbers, and hyphens only."),
    adminName: z.string().trim().min(2, "Admin name must be at least 2 characters."),
    adminEmail: z.string().trim().min(1, "Email is required.").email("Enter a valid email."),
    adminPassword: newPasswordSchema,
    confirmPassword: z.string().min(1, "Confirm the password."),
  })
  .refine((values) => values.adminPassword === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

const EMPTY_FORM = {
  hospitalName: "",
  hospitalCode: "",
  adminName: "",
  adminEmail: "",
  adminPassword: "",
  confirmPassword: "",
};

/** Accepts both a Zod flatten ({ fieldErrors }) and a plain field → messages map. */
function extractFieldErrors(details: unknown): Record<string, string> {
  if (!details || typeof details !== "object") return {};
  const source = details as { fieldErrors?: unknown } & Record<string, unknown>;
  const raw = (
    source.fieldErrors && typeof source.fieldErrors === "object" ? source.fieldErrors : source
  ) as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (Array.isArray(value) && value.length > 0) out[key] = value.map(String).join(" ");
    else if (typeof value === "string" && value) out[key] = value;
  }
  return out;
}

export default function SetupPage() {
  const router = useRouter();
  const { user, isLoading } = useSession();

  const [phase, setPhase] = useState<Phase>("checking");
  const [statusError, setStatusError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [values, setValues] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [conflict, setConflict] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [createdHealthId, setCreatedHealthId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Authenticated workers have no business here — back to their dashboard.
  useEffect(() => {
    if (!isLoading && user) router.replace("/");
  }, [isLoading, user, router]);

  // Pre-flight status check. The form never renders before this resolves.
  useEffect(() => {
    if (isLoading || user) return;
    let active = true;

    async function run() {
      try {
        const res = await fetch("/api/bootstrap/status", { cache: "no-store" });
        if (!active) return;
        if (res.ok) {
          const data = (await res.json()) as { needsSetup: boolean };
          setStatusError(false);
          setPhase(data.needsSetup ? "form" : "already-initialized");
        } else {
          setStatusError(true);
        }
      } catch {
        if (active) setStatusError(true);
      }
    }

    void run();
    return () => {
      active = false;
    };
  }, [isLoading, user, reloadKey]);

  // Already initialized → auto-return to login shortly.
  useEffect(() => {
    if (phase !== "already-initialized") return;
    const id = window.setTimeout(() => router.replace("/login"), 1500);
    return () => window.clearTimeout(id);
  }, [phase, router]);

  function setField(name: keyof typeof EMPTY_FORM, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function copyHealthId() {
    if (!createdHealthId) return;
    try {
      await navigator.clipboard.writeText(createdHealthId);
      setCopied(true);
    } catch {
      // visible on screen — copy by hand
    }
  }

  async function submit() {
    setFieldErrors({});
    setFormError(null);
    setConflict(false);

    const parsed = setupSchema.safeParse(values);
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hospitalName: parsed.data.hospitalName,
          hospitalCode: parsed.data.hospitalCode,
          adminName: parsed.data.adminName,
          adminEmail: parsed.data.adminEmail,
          adminPassword: parsed.data.adminPassword,
        }),
      });

      if (res.status === 201) {
        const data = (await res.json()) as { message: string; healthId: string };
        setCreatedHealthId(data.healthId);
        setValues(EMPTY_FORM); // wipe passwords (and everything) from form state
        setPhase("success");
        setSubmitting(false);
        return;
      }

      const body = (await res.json().catch(() => null)) as
        | { error?: string; details?: unknown }
        | null;

      if (res.status === 403) {
        // Race guard: setup completed between page load and submit.
        setPhase("already-initialized");
      } else if (res.status === 409) {
        setConflict(true);
      } else if (res.status === 400) {
        const fields = extractFieldErrors(body?.details);
        setFieldErrors(fields);
        if (Object.keys(fields).length === 0) {
          setFormError("Check the form. Some values were rejected.");
        }
      } else {
        setFormError("Something went wrong. Try again.");
      }
    } catch {
      setFormError("Connection problem. Check your network and try again.");
    }
    setSubmitting(false);
  }

  /* ── Status unreachable ── */
  if (statusError) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-section font-semibold text-ink">Couldn&apos;t check system status</p>
          <p className="mt-2 text-body text-slate-ink">
            The setup status endpoint didn&apos;t respond. Check the server and try again.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-5"
            onClick={() => {
              setStatusError(false);
              setReloadKey((key) => key + 1);
            }}
          >
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  /* ── Neutral loader while session + status resolve — never flash the form ── */
  if (isLoading || phase === "checking") {
    return (
      <Card>
        <CardContent className="space-y-4 py-8">
          <Skeleton className="mx-auto h-6 w-44" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="mx-auto h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  /* ── Already initialized (pre-flight or 403 race) ── */
  if (phase === "already-initialized") {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-section font-semibold text-ink">
            This system is already initialized.
          </p>
          <p className="mt-2 text-body text-slate-ink">Returning you to the login screen…</p>
          <Button
            variant="primary"
            size="sm"
            className="mt-5"
            onClick={() => router.replace("/login")}
          >
            Go to login
          </Button>
        </CardContent>
      </Card>
    );
  }

  /* ── Success: display-once Health ID ── */
  if (phase === "success" && createdHealthId) {
    return (
      <Card className="border-l-4 border-l-trust-teal">
        <CardHeader>
          <CardTitle>System initialized.</CardTitle>
          <CardDescription>
            The first hospital and its admin account now exist. Bootstrap is permanently
            disabled.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-data font-medium text-slate-ink">Admin Health ID</p>
            <p className="mono mt-1 text-title font-semibold text-ink">{createdHealthId}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void copyHealthId()}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy Health ID"}
          </Button>
          <p className="text-data font-medium text-amber-watch">
            Save this Health ID now. It is shown only once.
          </p>
          <p className="text-data text-slate-ink">
            Log in with this Health ID, your email, and the password you just set. A
            one-time code will be delivered (dev: printed to the server console).
          </p>
          <Button variant="primary" className="w-full" onClick={() => router.replace("/login")}>
            Continue to login
          </Button>
        </CardContent>
      </Card>
    );
  }

  /* ── The setup form ── */
  return (
    <Card>
      <CardHeader>
        <p className="text-section-lg font-semibold text-deep-indigo">AuthMedix</p>
        <CardTitle className="mt-2">System setup</CardTitle>
        <CardDescription>
          First run only, creates the first hospital and its admin account. This
          endpoint disables itself afterwards.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          noValidate
          className="space-y-4"
        >
          {conflict ? (
            <div
              role="alert"
              className="rounded-sm border border-alert-coral/40 border-l-4 border-l-alert-coral bg-alert-coral-soft px-3 py-2 text-body text-alert-coral"
            >
              That hospital code or email is already in use.
            </div>
          ) : null}

          <div>
            <Label htmlFor="hospitalName">Hospital name</Label>
            <Input
              id="hospitalName"
              className="mt-1"
              placeholder="Lagos University Teaching Hospital"
              value={values.hospitalName}
              onChange={(e) => setField("hospitalName", e.target.value)}
              invalid={!!fieldErrors.hospitalName}
            />
            <FieldError>{fieldErrors.hospitalName}</FieldError>
          </div>

          <div>
            <Label htmlFor="hospitalCode">Hospital code</Label>
            <Input
              id="hospitalCode"
              mono
              className="mt-1"
              placeholder="LUTH"
              value={values.hospitalCode}
              onChange={(e) => setField("hospitalCode", e.target.value.toUpperCase())}
              invalid={!!fieldErrors.hospitalCode}
            />
            <FieldHint>Prefix for Health IDs and patient codes, e.g. LUTH</FieldHint>
            <FieldError>{fieldErrors.hospitalCode}</FieldError>
          </div>

          <div>
            <Label htmlFor="adminName">Admin full name</Label>
            <Input
              id="adminName"
              className="mt-1"
              placeholder="Amina Okonkwo"
              value={values.adminName}
              onChange={(e) => setField("adminName", e.target.value)}
              invalid={!!fieldErrors.adminName}
            />
            <FieldError>{fieldErrors.adminName}</FieldError>
          </div>

          <div>
            <Label htmlFor="adminEmail">Admin email</Label>
            <Input
              id="adminEmail"
              type="email"
              className="mt-1"
              placeholder="admin@luth.gov"
              value={values.adminEmail}
              onChange={(e) => setField("adminEmail", e.target.value)}
              invalid={!!fieldErrors.adminEmail}
            />
            <FieldError>{fieldErrors.adminEmail}</FieldError>
          </div>

          <div>
            <Label htmlFor="adminPassword">Admin password</Label>
            <Input
              id="adminPassword"
              type="password"
              autoComplete="new-password"
              className="mt-1"
              value={values.adminPassword}
              onChange={(e) => setField("adminPassword", e.target.value)}
              invalid={!!fieldErrors.adminPassword}
            />
            <PasswordStrength password={values.adminPassword} />
            <FieldError>{fieldErrors.adminPassword}</FieldError>
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              className="mt-1"
              value={values.confirmPassword}
              onChange={(e) => setField("confirmPassword", e.target.value)}
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
            Initialize system
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}