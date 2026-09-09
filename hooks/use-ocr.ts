"use client";

import { useCallback, useState } from "react";
import { createWorker } from "tesseract.js";

/** Client-side OCR: image in, editable text out. Nothing is uploaded anywhere. */
export function useOcr() {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ocrError, setOcrError] = useState<string | null>(null);

  const extractText = useCallback(async (file: File): Promise<string | null> => {
    setProcessing(true);
    setProgress(0);
    setOcrError(null);
    const worker = await createWorker("eng", 1, {
      logger: (m: { status?: string; progress?: number }) => {
        if (m.status === "recognizing text" && typeof m.progress === "number") {
          setProgress(m.progress);
        }
      },
    });
    try {
      const { data } = await worker.recognize(file);
      return data.text.trim();
    } catch {
      setOcrError("Could not read text from that file. Try a clearer image.");
      return null;
    } finally {
      await worker.terminate();
      setProcessing(false);
    }
  }, []);

  return { processing, progress, ocrError, extractText };
}