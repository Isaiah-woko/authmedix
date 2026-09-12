"use client";

/**
 * Screen 8 — Add Documentation. One screen, three input modes:
 * Typed / Dictate (Web Speech) / Upload+OCR (Tesseract.js). Dictation and OCR
 * both route through an editable review box before saving (screen spec §8).
 *
 * Record TYPE comes from the server-enforced authoring matrix (HANDOFF §3.5);
 * mode is only how content enters. UPLOAD mode requires UPLOAD authoring.
 * No file-upload endpoint exists — OCR text is sent as content (HANDOFF §2).
 */

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { usePatientAccess } from "@/hooks/use-patient-access";
import { usePatientIdentity } from "@/hooks/use-patient-identity";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { api, describeApiError } from "@/lib/api";
import { authorableTypes } from "@/lib/role";
import { RECORD_TYPE_LABELS } from "@/lib/constants";
import { zodFieldErrors } from "@/lib/utils";
import { addRecordSchema, type RecordType, type Role } from "@/types";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldError, FieldHint, Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { DictationRecorder, isDictationSupported } from "@/components/domain/dictation-recorder";
import { OcrUploader } from "@/components/domain/ocr-uploader";
import { RecordAuthoringTabs, type AuthoringMode } from "@/components/domain/record-authoring-tabs";

export default function AddDocumentationPage() {
  const params = useParams<{ patientId: string }>();
  const patientId = params?.patientId ?? null;
  const { user, isLoading } = useSession();
  const { state } = usePatientAccess(patientId);
  const identity = usePatientIdentity(patientId);

  if (isLoading || !user || !state) return <Skeleton className="h-64 w-full" />;

  if (state.status !== "allowed") {
    return (
      <EmptyState
        title="Active access required"
        body={
          state.status === "denied"
            ? "You need an active, unexpired passport for this patient before you can add documentation."
            : state.status === "not_found"
              ? "This patient doesn't exist or isn't available to your hospital."
              : state.message
        }
        action={
          <Link href={`/patients/${patientId}`}>
            <Button variant="outline" size="sm">Back to patient</Button>
          </Link>
        }
      />
    );
  }

  const authorable = authorableTypes(user.role) as readonly RecordType[];
  if (authorable.length === 0) {
    return (
      <EmptyState
        title="Nothing to author"
        body="Your role can't create records for this patient."
      />
    );
  }

  return (
    <DocumentationWorkspace
      key={user.id}
      patientId={patientId ?? ""}
      role={user.role}
      patientName={identity?.name ?? state.data.name}
      authorable={authorable}
    />
  );
}

function DocumentationWorkspace({
  patientId,
  role,
  patientName,
  authorable,
}: {
  patientId: string;
  role: Role;
  patientName: string;
  authorable: readonly RecordType[];
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [mode, setMode] = useState<AuthoringMode>("typed");
  const [dictationSupported] = useState(() => isDictationSupported());
  const [recordType, setRecordType] = useState<RecordType>(authorable[0]);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function save() {
    setFieldErrors({});
    setFormError(null);

    const parsed = addRecordSchema.safeParse({ patientId, type: recordType, content });
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      return;
    }

    setSubmitting(true);
    const result = await api.records.create(parsed.data);
    setSubmitting(false);

    if (result.ok) {
      toast({
        title: "Record saved",
        description: `${RECORD_TYPE_LABELS[result.data.type]} added to the patient record.`,
        tone: "success",
      });
      router.push(`/patients/${patientId}`);
      return;
    }
    setFormError(describeApiError(result));
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/" },
          { label: patientName, href: `/patients/${patientId}` },
          { label: "Add documentation" },
        ]}
      />

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Add documentation — {patientName}</CardTitle>
          <CardDescription>
            Type, dictate, or scan. Dictation and OCR drop editable text into the review
            box below — always review before saving.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <RecordAuthoringTabs
            role={role}
            value={mode}
            onChange={setMode}
            dictationSupported={dictationSupported}
          />

          {mode === "dictate" ? (
            <DictationRecorder
              onTranscript={(text) => setContent((prev) => (prev ? `${prev} ${text}` : text))}
            />
          ) : null}

          {mode === "upload" ? <OcrUploader onExtracted={(text) => setContent(text)} /> : null}

          <div className="max-w-xs">
            <Label htmlFor="recordType">Record type</Label>
            <Select
              id="recordType"
              className="mt-1"
              value={recordType}
              onChange={(e) => setRecordType(e.target.value as RecordType)}
            >
              {authorable.map((type) => (
                <option key={type} value={type}>
                  {RECORD_TYPE_LABELS[type]}
                </option>
              ))}
            </Select>
            <FieldHint>Only types your role may author.</FieldHint>
          </div>

          <div>
            <Label htmlFor="content">
              {mode === "typed" ? "Content" : "Review before saving"}
            </Label>
            <Textarea
              id="content"
              rows={8}
              className="mt-1"
              placeholder={
                mode === "upload"
                  ? "Extracted text appears here for review…"
                  : mode === "dictate"
                    ? "Dictated text appears here for review…"
                    : "Write the record content…"
              }
              value={content}
              onChange={(e) => setContent(e.target.value)}
              invalid={!!fieldErrors.content}
            />
            {mode !== "typed" ? (
              <FieldHint>Edit freely — nothing is saved until you press Save.</FieldHint>
            ) : null}
            <FieldError>{fieldErrors.content}</FieldError>
          </div>

          {formError ? (
            <div role="alert">
              <FieldError>{formError}</FieldError>
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button type="button" loading={submitting} onClick={() => void save()}>
              Save record
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}