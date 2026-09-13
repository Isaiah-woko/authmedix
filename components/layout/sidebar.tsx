"use client";

/**
 * Role-aware persistent sidebar (Frontend Brief §6) on the brand Deep Indigo
 * (#2B3A67) — the design system's nav/brand accent. Active item = white left
 * bar + subtle white tint; meaning-colors stay reserved for access states.
 * Every nav item carries an icon for fast scanning under time pressure.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Circle,
  Flag,
  HeartPulse,
  Inbox,
  KeyRound,
  LayoutDashboard,
  ScrollText,
  Search,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { navSectionsFor, roleLabel } from "@/lib/role";
import { cn, hospitalCode } from "@/lib/utils";
import { BrandMark } from "@/components/domain/brand-mark";

/** Presentation-only mapping — nav structure lives in lib/role.ts, icons here. */
const NAV_ICONS: Record<string, LucideIcon> = {
  "/": LayoutDashboard,
  "/search": Search,
  "/admin/requests": Inbox,
  "/admin/passports": KeyRound,
  "/admin/staff": Users,
  "/admin/patients": HeartPulse,
  "/admin/flagged": Flag,
  "/admin/audit": ScrollText,
};

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
        "flex w-56 shrink-0 flex-col h-screen overflow-y-auto border-r border-deep-indigo-dark bg-deep-indigo",
        className
      )}
    >
      <div className="border-b border-white/10 px-4 py-4">
        <div className="flex items-center gap-2">
          <BrandMark className="h-6 w-6" />
          <p className="text-section-lg font-semibold text-white">MediTrust</p>
        </div>
        <p className="mt-0.5 text-data text-white/60">
          {roleLabel(user.role)} · {hospitalCode(user.healthId)}
        </p>
      </div>

      <nav className="flex-1 py-2" aria-label="Main navigation">
        {sections.map((section) => {
          const active =
            pathname === section.href ||
            (section.href !== "/" && pathname.startsWith(section.href));
          const Icon = NAV_ICONS[section.href] ?? Circle;
          return (
            <Link
              key={section.href}
              href={section.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 border-l-2 px-4 py-2 text-body",
                active
                  ? "border-white bg-white/10 font-medium text-white"
                  : "border-transparent text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {section.label}
            </Link>
          );
        })}
      </nav>

      <div className="hidden border-t border-white/10 px-4 py-3 md:block">
        <Link
          href="/settings/change-password"
          className="text-data font-medium text-white underline-offset-2 hover:underline"
        >
          Change password
        </Link>
        <p className="mt-2 text-data text-white/60">
          Zero standing access, every view is granted, scoped, and time-bound.
        </p>
      </div>
    </aside>
  );
}