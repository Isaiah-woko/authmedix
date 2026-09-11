"use client";

/**
 * Role-aware sidebar (Frontend Brief §6). Rendered twice by AppShell:
 * static on md+, and inside a drawer below md. Active = Deep Indigo left bar.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/hooks/use-session";
import { navSectionsFor, roleLabel } from "@/lib/role";
import { cn, hospitalCode } from "@/lib/utils";

export function Sidebar({
  onNavigate,
  className,
}: {
  /** Called after a link click — AppShell uses it to close the mobile drawer. */
  onNavigate?: () => void;
  className?: string;
}) {
  const { user } = useSession();
  const pathname = usePathname();

  if (!user) return null;
  const sections = navSectionsFor(user.role);

  return (
    <aside
      className={cn(
        "flex w-56 shrink-0 flex-col border-r border-line bg-white",
        className
      )}
    >
      <div className="border-b border-line px-4 py-4">
        <p className="text-section-lg font-semibold text-deep-indigo">MediTrust</p>
        <p className="mt-0.5 text-data text-slate-ink">
          {roleLabel(user.role)} · {hospitalCode(user.healthId)}
        </p>
      </div>

      <nav className="flex-1 py-2" aria-label="Main navigation">
        {sections.map((section) => {
          const active =
            pathname === section.href ||
            (section.href !== "/" && pathname.startsWith(section.href));
          return (
            <Link
              key={section.href}
              href={section.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center border-l-2 px-4 py-2 text-body",
                active
                  ? "border-deep-indigo bg-deep-indigo-soft font-medium text-ink"
                  : "border-transparent text-slate-ink hover:bg-paper-dim hover:text-ink"
              )}
            >
              {section.label}
            </Link>
          );
        })}
      </nav>

      <div className="hidden border-t border-line px-4 py-3 md:block">
        <p className="text-data text-slate-ink">
          Zero standing access — every view is granted, scoped, and time-bound.
        </p>
      </div>
    </aside>
  );
}