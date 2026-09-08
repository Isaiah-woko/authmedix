"use client";

import { useRef, useState } from "react";
import type { ClipboardEvent, KeyboardEvent } from "react";

interface Props {
  /** Fires on every change with the joined digits and whether all 6 are filled */
  onCodeChange: (code: string, complete: boolean) => void;
  disabled?: boolean;
}

/** Six single-digit boxes with auto-advance, backspace-back, and paste support. */
export function OtpCodeInput({ onCodeChange, disabled }: Props) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  function commit(next: string[]) {
    setDigits(next);
    onCodeChange(next.join(""), next.every((d) => d !== ""));
  }

  function handleChange(index: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1);
    if (!digit) return;
    const next = [...digits];
    next[index] = digit;
    commit(next);
    if (index < 5) refs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace") {
      event.preventDefault();
      const next = [...digits];
      if (next[index] !== "") {
        next[index] = "";
        commit(next);
      } else if (index > 0) {
        next[index - 1] = "";
        commit(next);
        refs.current[index - 1]?.focus();
      }
    }
    if (event.key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus();
    if (event.key === "ArrowRight" && index < 5) refs.current[index + 1]?.focus();
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).split("");
    if (pasted.length === 0) return;
    const next = Array(6).fill("");
    pasted.forEach((d, i) => {
      next[i] = d;
    });
    commit(next);
    refs.current[Math.min(pasted.length, 5)]?.focus();
  }

  return (
    <div className="flex gap-2.5">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          disabled={disabled}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          aria-label={`Code digit ${index + 1}`}
          className="identifier h-14 w-14 rounded-md border border-slate/40 bg-white text-center text-body-lg text-ink focus:border-deep-indigo focus:outline-none focus:ring-2 focus:ring-deep-indigo/30 disabled:opacity-50"
        />
      ))}
    </div>
  );
}