"use client";

/**
 * Six separate boxes: auto-advance on type, backspace walks back,
 * paste distributes digits, arrow keys navigate. 48px targets for touch.
 */

import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

export function OtpInput({
  value,
  onChange,
  length = 6,
  disabled = false,
  invalid = false,
}: {
  value: string;
  onChange: (next: string) => void;
  length?: number;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  function commit(next: string[]) {
    onChange(next.join("").slice(0, length));
  }

  function handleChange(index: number, raw: string) {
    const cleaned = raw.replace(/\D/g, "");
    if (!cleaned) {
      const next = digits.slice();
      next[index] = "";
      commit(next);
      return;
    }
    const next = digits.slice();
    const chars = cleaned.split("");
    for (let i = 0; i < chars.length && index + i < length; i++) {
      next[index + i] = chars[i];
    }
    commit(next);
    refs.current[Math.min(index + chars.length, length - 1)]?.focus();
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace") {
      event.preventDefault();
      const next = digits.slice();
      if (next[index]) {
        next[index] = "";
        commit(next);
      } else if (index > 0) {
        next[index - 1] = "";
        commit(next);
        refs.current[index - 1]?.focus();
      }
    }
    if (event.key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus();
    if (event.key === "ArrowRight" && index < length - 1) refs.current[index + 1]?.focus();
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    commit(Array.from({ length }, (_, i) => pasted[i] ?? ""));
    refs.current[Math.min(pasted.length, length - 1)]?.focus();
  }

  return (
    <div className="flex justify-center gap-2 sm:gap-3">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${index + 1} of ${length}`}
          className={cn(
            "mono h-12 w-full max-w-12 flex-1 rounded-sm border bg-white text-center text-lg text-ink",
            "focus:outline-none",
            invalid
              ? "border-alert-coral focus:border-alert-coral"
              : "border-line focus:border-trust-teal",
            "disabled:cursor-not-allowed disabled:bg-paper-dim"
          )}
        />
      ))}
    </div>
  );
}