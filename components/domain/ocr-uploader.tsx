"use client";

/**
 * Upload + OCR: extraction runs entirely in the browser via tesseract.js —
 * the image never leaves the device; only the reviewed text is saved as an
 * UPLOAD record (no file-upload endpoint exists by design, Backend Brief §2).
 *
 * Failure modes are surfaced distinctly:
 *  - wrong type / too large → immediate specific message, no engine started
 *  - recognition succeeded but page is blank → "no readable text" message
 *  - engine failure → calm copy in prod, REAL error in dev UI + console
 */

import { useRef, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError, FieldHint } from "@/components/ui/label";

const MAX_BYTES = 10 * 1024 * 1024;

export function OcrUploader({ onExtracted }: { onExtracted: (text: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("That file isn't an image. Upload a PNG, JPG, or WebP scan. PDFs aren't supported.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("That image is larger than 10 MB. Export a smaller scan and try again.");
      return;
    }

    setBusy(true);
    setProgress(0);
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", 1, {
        logger: (m: { status?: string; progress?: number }) => {
          if (m.status === "recognizing text" && typeof m.progress === "number") {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });
      try {
        const { data } = await worker.recognize(file);
        const text = (data.text ?? "").trim();
        if (text.length === 0) {
          setError("No readable text found in that image. Try a clearer, higher-contrast scan.");
        } else {
          onExtracted(text);
        }
      } finally {
        await worker.terminate();
      }
    } catch (err) {
      console.error("[ocr] extraction failed:", err);
      const detail = err instanceof Error ? err.message : String(err);
      setError(
        process.env.NODE_ENV === "development"
          ? `OCR failed: ${detail}`
          : "OCR failed. Check the file is a readable image and try again."
      );
    } finally {
      setBusy(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = ""; // allow re-picking same file
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        id="ocr-file"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/bmp"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      <label htmlFor="ocr-file">
        <Button type="button" variant="outline" size="sm" disabled={busy}>
          <span className="flex items-center gap-2">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />}
            {busy ? `Reading… ${progress}%` : "Choose image to scan"}
          </span>
        </Button>
      </label>

      {error ? (
        <div role="alert">
          <FieldError>{error}</FieldError>
        </div>
      ) : null}

      <FieldHint>
        Extraction runs on this device. The image is never uploaded. Only the text you
        review and save becomes a record.
      </FieldHint>
    </div>
  );
}