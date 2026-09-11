"use client";

import { cn } from "@/lib/utils";

export interface TabDef {
  value: string;
  label: string;
  /** Hide the tab entirely for roles that can't use it — never disable it
   *  (same rule as the Renew button: omission, not disabled state). */
  hidden?: boolean;
}

export function Tabs({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: TabDef[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const visible = tabs.filter((t) => !t.hidden);
  return (
    <div role="tablist" className={cn("flex border-b border-line", className)}>
      {visible.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(tab.value)}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-body",
              active
                ? "border-deep-indigo font-medium text-ink"
                : "border-transparent text-slate-ink hover:text-ink"
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}