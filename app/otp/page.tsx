"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resendCode, verifyCode } from "@/lib/api/auth";
import { useSession } from "@/providers/session-provider";

const CODE_WINDOW_SECONDS = 300;
const PENDING_KEY = "meditrust.pendingLogin";

interface Pending {
  healthId: string;
  email: string;
  issuedAt: number;
}

function readPending(): Pending | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(PENDING_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Pending;
  } catch {
    return null;
  }
}

export default function OtpPage() {
  const router = useRouter();
  const { refresh } = useSession();
  const [pending, setPending] = useState<Pending | null>(null);
  const [code, setCode] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(CODE_WINDOW_SECONDS);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
   const p = readPending();
   if (!p) {
     router.replace("/login");
     return;
   }
    // One-time mount read from sessionStorage. This single synchronous set is
    // deliberate: the page cannot render anything meaningful before it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPending(p);
  }, [router]);

  useEffect(() => {
    if (!pending) return;
    const tick = () => {
      const elapsed = Math.floor((Date.now() - pending.issuedAt) / 1000);
      setSecondsLeft(Math.max(0, CODE_WINDOW_SECONDS - elapsed));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [pending]);

  const expired = secondsLeft <= 0;
  const pad = (n: number) => String(n).padStart(2, "0");

  async function handleVerify(event: FormEvent) {
    event.preventDefault();
    if (!pending) return;
    setSubmitting(true);
    setError(null);
    try {
      await verifyCode({ healthId: pending.healthId, code: code.trim() });
      sessionStorage.removeItem(PENDING_KEY);
      await refresh();
      router.replace("/dashboard");
    } catch (err) {
      const e = err as { message?: string };
      setError(e.message ?? "Could not verify the code.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (!pending) return;
    setResending(true);
    setError(null);
    try {
      await resendCode({ healthId: pending.healthId });
      const updated: Pending = { ...pending, issuedAt: Date.now() };
      sessionStorage.setItem(PENDING_KEY, JSON.stringify(updated));
      setPending(updated);
      setCode("");
    } catch (err) {
      const e = err as { message?: string };
      setError(e.message ?? "Could not send a new code.");
    } finally {
      setResending(false);
    }
  }

  if (!pending) return null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4">
      <section className="w-full max-w-md rounded border border-section-line bg-white p-8">
        <p className="text-page-title font-semibold text-deep-indigo">Enter your code</p>
        <p className="mt-1 text-body text-slate">
          We sent a one-time code for {pending.healthId}. Check the terminal running pnpm dev for the code.
        </p>
        <p className="identifier mt-3 text-body-lg text-deep-indigo">
          {expired ? "Code expired" : `Code expires in ${pad(Math.floor(secondsLeft / 60))}:${pad(secondsLeft % 60)}`}
        </p>
        {error && (
          <div className="mt-4">
            <Alert tone="error">{error}</Alert>
          </div>
        )}
        <form onSubmit={handleVerify} className="mt-6 flex flex-col gap-4">
          <Input
            label="6-digit code"
            name="code"
            identifier
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            required
          />
          <Button type="submit" loading={submitting} disabled={expired}>
            Verify and continue
          </Button>
        </form>
        <Button variant="ghost" className="mt-3" onClick={handleResend} loading={resending}>
          Send a new code
        </Button>
      </section>
    </main>
  );
}