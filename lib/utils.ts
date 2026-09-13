import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
import { format } from "date-fns";

/*
  tailwind-merge doesn't know our custom font-size tokens (text-body, text-data, …)
  and would misread them as text *colors*, wrongly dropping them when merged with
  text-ink etc. Teach it our font-size scale once, here.
*/
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["body", "body-lg", "data", "section", "section-lg", "title"] },
      ],
    },
  },
});

/** Merge Tailwind classes safely — later classes win on conflict. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 12 Apr 1985 */
export function formatDate(value: string | Date): string {
  return format(new Date(value), "dd MMM yyyy");
}

/** 12 Apr 1985, 14:30 */
export function formatDateTime(value: string | Date): string {
  return format(new Date(value), "dd MMM yyyy, HH:mm");
}

/** 12 Apr 1985 14:30:05 — for audit-log rows (rendered in mono). */
export function formatTimestamp(value: string | Date): string {
  return format(new Date(value), "dd MMM yyyy HH:mm:ss");
}

/** Health IDs arrive pre-formatted (LUTH-DOC-0001); normalize defensively. */
export function formatHealthId(healthId: string): string {
  return healthId?.trim().toUpperCase() ?? "";
}

/** doc@luth.gov → d***@luth.gov */
export function maskEmail(email: string): string {
  if (!email) return "";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  return `${local.slice(0, 1)}${"*".repeat(Math.max(local.length - 1, 2))}@${domain}`;
}

/** LUTH-DOC-0001 → LUTH. The session has no hospital name; the code prefix is the honest label. */
export function hospitalCode(healthId: string): string {
  return healthId.split("-")[0] ?? "";
}

import type { ZodError } from "zod";

/** First error message per top-level field, for inline form errors. */
export function zodFieldErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}