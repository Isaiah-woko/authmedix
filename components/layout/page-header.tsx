import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** 24px semibold title + Slate subtitle + optional right-aligned actions. */
export function PageHeader({
  title,
  subtitle,
  actions,
  className
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="text-title font-semibold text-ink">{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-body text-slate-ink">{subtitle}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row md:items-center">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
