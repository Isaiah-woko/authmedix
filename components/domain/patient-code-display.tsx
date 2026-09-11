"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";

/** Mono-rendered patient code with copy-to-clipboard. */
export function PatientCodeDisplay({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // fail silently
    }
  }

  return (
    <Tooltip label={copied ? "Copied" : "Click to copy"}>
      <button
        type="button"
        onClick={() => void copy()}
        className={cn("mono text-data text-slate-ink hover:text-ink", className)}
      >
        {code}
      </button>
    </Tooltip>
  );
}