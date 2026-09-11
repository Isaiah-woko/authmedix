"use client";

import { useState } from "react";
import { cn, formatHealthId } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";

/** Mono-rendered Health ID with copy-to-clipboard on click. */
export function HealthIdDisplay({
  healthId,
  className,
}: {
  healthId: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const formatted = formatHealthId(healthId);

  async function copy() {
    try {
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard not available (e.g. non-HTTPS) — fail silently
    }
  }

  return (
    <Tooltip label={copied ? "Copied" : "Click to copy"}>
      <button
        type="button"
        onClick={() => void copy()}
        className={cn("mono text-data text-slate-ink hover:text-ink", className)}
      >
        {formatted}
      </button>
    </Tooltip>
  );
}