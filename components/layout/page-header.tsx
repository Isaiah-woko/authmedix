import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** 24px semibold title + Slate subtitle + optional right-aligned actions. */
export function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex items-start justify-between gap-4", className)}>
      <div>
        <h1 className="text-title font-semibold text-ink">{title}</h1>
        {subtitle ? <p className="mt-1 text-body text-slate-ink">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}