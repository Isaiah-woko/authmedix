"use client";

/**
 * Live mirror of the server's strength rule (10+ chars, upper, lower, number,
 * symbol). Feedback before submit; the backend remains the real gate.
 */

import { checkPasswordStrength } from "@/lib/client-validators";
import { cn } from "@/lib/utils";

export function PasswordStrength({ password }: { password: string }) {
  const { checks, valid } = checkPasswordStrength(password);
  if (!password) return null;

  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1" aria-hidden="true">
        {checks.map((check) => (
          <div
            key={check.id}
            className={cn("h-1 flex-1 rounded-full", check.passed ? "bg-trust-teal" : "bg-line")}
          />
        ))}
      </div>
      <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
        {checks.map((check) => (
          <li
            key={check.id}
            className={cn(
              "flex items-center gap-1.5 text-data",
              check.passed ? "text-trust-teal" : "text-slate-ink"
            )}
          >
            <span aria-hidden="true">{check.passed ? "✓" : "•"}</span>
            {check.label}
          </li>
        ))}
      </ul>
      {valid ? (
        <p className="mt-1 text-data text-trust-teal">Password meets the strength rule.</p>
      ) : null}
    </div>
  );
}