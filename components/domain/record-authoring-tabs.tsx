"use client";

import type { Role } from "@/types";
import { canAuthor } from "@/lib/role";
import { Tabs, type TabDef } from "@/components/ui/tabs";

export type AuthoringMode = "typed" | "dictate" | "upload";

/**
 * Input-mode tabs for Add Documentation.
 * Upload is HIDDEN when the role can't author UPLOAD records (omitted, never
 * disabled — same rule as the Renew button). Dictation hides itself when the
 * browser lacks the Web Speech API.
 */
export function RecordAuthoringTabs({
  role,
  value,
  onChange,
  dictationSupported,
}: {
  role: Role;
  value: AuthoringMode;
  onChange: (mode: AuthoringMode) => void;
  dictationSupported: boolean;
}) {
  const tabs: TabDef[] = [
    { value: "typed", label: "Typed note" },
    { value: "dictate", label: "Dictate", hidden: !dictationSupported },
    { value: "upload", label: "Upload + OCR", hidden: !canAuthor(role, "UPLOAD") },
  ];
  return <Tabs tabs={tabs} value={value} onChange={(v) => onChange(v as AuthoringMode)} />;
}