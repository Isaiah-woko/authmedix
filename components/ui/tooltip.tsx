"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Minimal hover/focus tooltip — for icon-only actions and truncated mono IDs. */
export function Tooltip({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open ? (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 z-[70] mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-sm bg-ink px-2 py-1 text-data text-white"
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}