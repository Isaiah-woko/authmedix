"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface SpeechResult {
  isFinal: boolean;
  0: { transcript: string };
}

interface SpeechEvent {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechResult };
}

interface SpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
}

function createRecognition(): SpeechRecognition | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

/** Browser dictation. Final sentences stream to onFinalChunk; interim text is previewed. */
export function useDictation(onFinalChunk: (chunk: string) => void) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [dictationError, setDictationError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const chunkCallbackRef = useRef(onFinalChunk);
  chunkCallbackRef.current = onFinalChunk;

  const supported =
    typeof window !== "undefined" &&
    ((window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition !== undefined ||
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition !== undefined);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
    setInterim("");
  }, []);

  const start = useCallback(() => {
    const recognition = createRecognition();
    if (!recognition) {
      setDictationError("This browser does not support dictation. Use Chrome or Edge, or type instead.");
      return;
    }
    recognition.lang = "en-GB";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        if (result.isFinal) chunkCallbackRef.current(transcript.trim());
        else interimText += transcript;
      }
      setInterim(interimText);
    };
    recognition.onend = () => {
      setListening(false);
      setInterim("");
    };
    recognition.onerror = (event) => {
      setDictationError(event.error ? `Dictation error: ${event.error}` : "Dictation error.");
      setListening(false);
    };
    setDictationError(null);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, []);

  useEffect(() => stop, [stop]);

  return { supported, listening, interim, dictationError, start, stop };
}