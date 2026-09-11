import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Calm, deliberate empty states — never error-styled. Empty is a normal
 * operating condition in this product: start of shift, cleared queue,
 * nothing pending. Worded plainly per the brief.
 */
export function EmptyState({
  title,
  body,
  action,
  icon,
  className,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-sm border border-dashed border-line bg-white px-6 py-12 text-center",
        className
      )}
    >
      {icon ? <div className="mb-3 text-slate-ink-soft">{icon}</div> : null}
      <p className="text-body-lg font-medium text-ink">{title}</p>
      {body ? <p className="mt-1 max-w-sm text-body text-slate-ink">{body}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}