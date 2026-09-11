import Link from "next/link";
import { Fragment } from "react";

export interface Crumb {
  label: string;
  href?: string;
}

/** Sentence-case trail; last crumb is plain Ink text (current page). */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-data text-slate-ink">
      {items.map((crumb, index) => (
        <Fragment key={`${crumb.label}-${index}`}>
          {index > 0 ? <span aria-hidden="true">/</span> : null}
          {crumb.href ? (
            <Link href={crumb.href} className="hover:text-ink">
              {crumb.label}
            </Link>
          ) : (
            <span className="text-ink">{crumb.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}