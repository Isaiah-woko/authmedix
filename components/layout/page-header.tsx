import type { ReactNode } from "react";

/** The standard page top: title + optional subtitle on the left, primary action on the right. */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-page-title font-semibold text-ink">{title}</h1>
        {subtitle ? <p className="mt-1 text-body text-slate">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}