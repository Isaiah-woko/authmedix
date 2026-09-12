"use client";

/**
 * Web Speech API dictation with a live interim transcript and a functional
 * recording indicator (motion that confirms an action — the design system's
 * only allowed motion). Transcription happens locally in the browser.
 * Unsupported browsers: caller hides the tab via isDictationSupported().
 *
 * The Web Speech API is not in TypeScript's DOM lib, so we declare the minimal
 * structural surface we touch — no `any` anywhere.
 */

import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

/* ── Minimal structural types for the Web Speech API ── */

interface SpeechAlternativeLike {
  transcript: string;
}

interface SpeechResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechAlternativeLike;
}

interface SpeechResultListLike {
  readonly length: number;
  [index: number]: SpeechResultLike;
}

interface SpeechResultEventLike {
  readonly resultIndex: number;
  readonly results: SpeechResultListLike;
}

interface SpeechErrorEventLike {
  readonly error: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechResultEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechErrorEventLike) => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isDictationSupported(): boolean {
  return getRecognitionCtor() !== null;
}

export function DictationRecorder({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef("");

  useEffect(() => () => recognitionRef.current?.abort(), []);

  function start() {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    setError(null);
    finalRef.current = "";
    setInterim("");

    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (event: SpeechResultEventLike) => {
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const chunk = result[0].transcript;
        if (result.isFinal) finalRef.current += `${chunk} `;
        else interimText += chunk;
      }
      setInterim(interimText);
    };

    rec.onerror = (event: SpeechErrorEventLike) => {
      setError(
        event.error === "not-allowed"
          ? "Microphone access was denied."
          : "Dictation error — try again, or type instead."
      );
      setListening(false);
    };

    rec.onend = () => {
      setListening(false);
      setInterim("");
      const text = finalRef.current.trim();
      if (text) onTranscript(text);
    };

    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }

  function stop() {
    recognitionRef.current?.stop();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant={listening ? "danger" : "primary"}
          size="sm"
          onClick={listening ? stop : start}
        >
          {listening ? <Square className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
          {listening ? "Stop dictation" : "Start dictation"}
        </Button>

        {listening ? (
          <div className="flex items-end gap-0.5" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="w-1 animate-pulse-soft rounded-full bg-alert-coral"
                style={{ height: `${8 + (i % 3) * 6}px`, animationDelay: `${i * 120}ms` }}
              />
            ))}
          </div>
        ) : null}

        <span className="text-data text-slate-ink">
          {listening ? "Listening — speak clearly…" : "Speech is transcribed locally in your browser."}
        </span>
      </div>

      {interim ? (
        <p className="rounded-sm border border-line bg-white p-3 text-body text-slate-ink">
          {interim}
        </p>
      ) : null}

      {error ? <p className="text-data text-alert-coral">{error}</p> : null}
    </div>
  );
}