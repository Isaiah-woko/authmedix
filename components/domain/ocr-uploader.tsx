"use client";

/**
 * Client-side OCR via Tesseract.js (dynamically imported — stays out of the
 * initial bundle; worker/core load on first use). There is NO file-upload
 * endpoint: extracted text is sent as plain `content` on an UPLOAD record
 * (HANDOFF §2). The image never leaves the browser.
 */

import { useState } from "react";
import { FileUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

export function OcrUploader({ onExtracted }: { onExtracted: (text: string) => void }) {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const busy = progress !== null;

  async function handleFile(file: File) {
    setError(null);
    setFileName(file.name);
    setProgress(0);
    try {
      const Tesseract = (await import("tesseract.js")).default;
      const result = await Tesseract.recognize(file, "eng", {
        logger: (m: { status?: string; progress?: number }) => {
          if (m.status === "recognizing text" && typeof m.progress === "number") {
            setProgress(m.progress);
          }
        },
      });
      const text = (result.data.text ?? "").trim();
      if (!text) {
        setError("No readable text found in that image — try a clearer scan, or type it.");
        setProgress(null);
        return;
      }
      onExtracted(text);
      setProgress(null);
    } catch {
      setError("OCR failed — check the file is a readable image and try again.");
      setProgress(null);
    }
  }

  return (
    <div className="space-y-3">
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-line bg-white px-4 py-8 text-center hover:bg-paper-dim/50">
        <FileUp className="h-5 w-5 text-slate-ink-soft" aria-hidden="true" />
        <span className="text-body font-medium text-ink">Choose a scanned document image</span>
        <span className="text-data text-slate-ink">
          PNG or JPG · OCR runs entirely in your browser · the image is never uploaded
        </span>
        <Input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
        />
      </label>

      {busy ? (
        <div>
          <div className="flex items-center justify-between text-data text-slate-ink">
            <span className="truncate">Extracting text from {fileName}…</span>
            <span className="mono">{Math.round((progress ?? 0) * 100)}%</span>
          </div>
          <Progress value={(progress ?? 0) * 100} tone="indigo" className="mt-1" />
        </div>
      ) : null}

      {error ? <p className="text-data text-alert-coral">{error}</p> : null}
    </div>
  );
}