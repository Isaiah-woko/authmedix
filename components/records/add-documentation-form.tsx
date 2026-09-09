"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { createRecord } from "@/lib/api";
import { useDictation } from "@/hooks/use-dictation";
import { useOcr } from "@/hooks/use-ocr";
import { formatRecordType } from "@/lib/format";
import { canAuthorRecordType, ROLE_AUTHORING } from "@/lib/roles";
import { ROUTES } from "@/lib/routes";
import { useSession } from "@/providers/session-provider";
import type { RecordType } from "@/types/record";

type Mode = "typed" | "dictation" | "scan";

export function AddDocumentationForm({
  patientId,
  patientName,
}: {
  patientId: string;
  patientName: string;
}) {
  const router = useRouter();
  const { session } = useSession();
  const role = session?.user.role ?? "DOCTOR";
  const allowedTypes = ROLE_AUTHORING[role];

  const [recordType, setRecordType] = useState<RecordType>(allowedTypes[0]);
  const [content, setContent] = useState("");
  const [mode, setMode] = useState<Mode>("typed");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dictation = useDictation((chunk) => {
    setContent((prev) => (prev ? `${prev} ${chunk}` : chunk));
  });
  const ocr = useOcr();

  async function handleFile(file: File) {
    const text = await ocr.extractText(file);
    if (text) {
      setContent((prev) => (prev ? `${prev}\n${text}` : text));
      setMode("typed");
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!content.trim()) {
      setError("Add some content before saving.");
      return;
    }
    if (!canAuthorRecordType(role, recordType)) {
      setError("Your role cannot author this record type.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createRecord({ patientId, type: recordType, content: content.trim() });
      setSaved(true);
    } catch (err) {
      const e = err as { message?: string };
      setError(e.message ?? "Could not save the record.");
    } finally {
      setSubmitting(false);
    }
  }

  if (saved) {
    return (
      <section className="max-w-lg rounded border border-trust-teal/40 bg-trust-teal/10 p-6">
        <p className="text-body-lg font-medium text-trust-teal">Record saved</p>
        <p className="mt-1 text-body text-slate">
          The {formatRecordType(recordType).toLowerCase()} has been added to {patientName}'s
          record and audit-logged.
        </p>
        <Button className="mt-4" onClick={() => router.push(ROUTES.patientRecord(patientId))}>
          Back to patient record
        </Button>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-5">
      {error && <Alert tone="error">{error}</Alert>}

      <div>
        <p className="mb-2 text-body font-medium text-ink">Record type</p>
        <div className="flex flex-wrap gap-2">
          {allowedTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setRecordType(type)}
              className={`rounded border px-3 py-1.5 text-body transition-colors ${
                recordType === type
                  ? "border-deep-indigo bg-deep-indigo/10 font-medium text-deep-indigo"
                  : "border-section-line bg-white text-slate hover:bg-paper"
              }`}
            >
              {formatRecordType(type)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-body font-medium text-ink">Content</p>
        <div className="mb-2 flex gap-2">
          {(["typed", "dictation", "scan"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded px-3 py-1 text-dense font-medium transition-colors ${
                mode === m ? "bg-deep-indigo/10 text-deep-indigo" : "text-slate hover:bg-paper"
              }`}
            >
              {m === "typed" ? "Typed" : m === "dictation" ? "Dictate" : "Scan (OCR)"}
            </button>
          ))}
        </div>

        {mode === "scan" && (
          <div className="mb-2 flex flex-col gap-2">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="text-body text-slate"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
            {ocr.processing && (
              <p className="text-dense text-slate">Reading text… {Math.round(ocr.progress * 100)}%</p>
            )}
            {ocr.ocrError && <Alert tone="error">{ocr.ocrError}</Alert>}
            <p className="text-dense text-slate">
              Extracted text lands in the box below for review. Nothing is uploaded: OCR runs in your browser.
            </p>
          </div>
        )}

        {mode === "dictation" && (
          <div className="mb-2 flex flex-col gap-2">
            <div className="flex gap-2">
              {!dictation.listening ? (
                <Button type="button" variant="secondary" onClick={dictation.start} disabled={!dictation.supported}>
                  Start dictation
                </Button>
              ) : (
                <Button type="button" variant="danger" onClick={dictation.stop}>
                  Stop
                </Button>
              )}
            </div>
            {!dictation.supported && (
              <p className="text-dense text-slate">
                This browser does not support dictation. Use Chrome or Edge, or type instead.
              </p>
            )}
            {dictation.listening && dictation.interim && (
              <p className="text-dense italic text-slate">{dictation.interim}</p>
            )}
            {dictation.dictationError && <Alert tone="error">{dictation.dictationError}</Alert>}
            <p className="text-dense text-slate">
              Final sentences append to the box below, where you review and edit before saving.
            </p>
          </div>
        )}

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={8}
          placeholder={
            recordType === "PRESCRIPTION" ? "Drug, dose, frequency, duration…" : "Clinical content…"
          }
          className="rounded border border-section-line bg-white px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-deep-indigo/30"
          required
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" loading={submitting} disabled={ocr.processing}>
          Save record
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push(ROUTES.patientRecord(patientId))}>
          Cancel
        </Button>
      </div>
    </form>
  );
}