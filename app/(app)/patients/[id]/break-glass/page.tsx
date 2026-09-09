"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { invokeBreakGlass } from "@/lib/api/break-glass";
import { BREAK_GLASS_CATEGORIES, JUSTIFICATION_PLACEHOLDER } from "@/lib/constants";
import type { EmergencyCategory } from "@/types/break-glass";

export default function BreakGlassPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const patientId = params.id;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [category, setCategory] = useState<EmergencyCategory | null>(null);
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!category) return;
    if (detail.trim().length < 10) {
      setError("Justification must be at least 10 characters.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await invokeBreakGlass({
        patientId,
        confirmedEmergency: true,
        reasonCategory: category,
        reasonDetail: detail,
      });
      // Redirect to patient record, which will now resolve with the active break-glass passport
      router.push(`/patients/${patientId}`);
    } catch (err) {
      const e = err as { message?: string };
      setError(e.message ?? "Could not invoke break-glass.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Break-Glass Emergency Access"
        subtitle="Bypass normal approval for an immediate clinical emergency. This action is flagged for admin review."
      />
      <section className="max-w-lg rounded border border-alert-coral/40 bg-alert-coral/5 p-6">
        {error && <div className="mb-4"><Alert tone="error">{error}</Alert></div>}

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <p className="text-body-lg font-medium text-ink">
              Is this an immediate clinical emergency requiring access to protected patient information?
            </p>
            <div className="flex gap-3">
              <Button variant="danger" onClick={() => setStep(2)}>Yes, proceed</Button>
              <Button variant="secondary" onClick={() => router.back()}>No, go back</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <p className="text-body-lg font-medium text-ink">Select the emergency category:</p>
            <div className="flex flex-col gap-2">
              {BREAK_GLASS_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => { setCategory(cat.value); setStep(3); }}
                  className={`rounded border px-4 py-3 text-left text-body transition-colors ${
                    category === cat.value
                      ? "border-alert-coral bg-alert-coral/10 text-ink"
                      : "border-section-line bg-white hover:bg-paper"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <Button variant="ghost" className="self-start" onClick={() => setStep(1)}>← Back</Button>
          </div>
        )}

        {step === 3 && category && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <p className="text-body-lg font-medium text-ink">Provide justification:</p>
            <p className="text-dense text-slate">
              Category: {BREAK_GLASS_CATEGORIES.find((c) => c.value === category)?.label}
            </p>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder={JUSTIFICATION_PLACEHOLDER}
              rows={4}
              className="rounded border border-section-line bg-white px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-alert-coral/30"
              required
            />
            <div className="flex gap-3">
              <Button variant="danger" type="submit" loading={submitting} disabled={detail.trim().length < 10}>
                Invoke Break-Glass
              </Button>
              <Button variant="secondary" type="button" onClick={() => setStep(2)}>← Back</Button>
            </div>
          </form>
        )}
      </section>
    </>
  );
}