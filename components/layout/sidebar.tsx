"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Flag,
  Inbox,
  KeyRound,
  LayoutDashboard,
  ScrollText,
  Search,
  UserPlus,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SessionCountdown } from "@/components/layout/session-countdown";
import { formatRole } from "@/lib/format";
import { getNavItems, ROUTES } from "@/lib/routes";
import { useSession } from "@/providers/session-provider";

const NAV_ICONS: Record<string, LucideIcon> = {
  [ROUTES.DASHBOARD]: LayoutDashboard,
  [ROUTES.SEARCH]: Search,
  [ROUTES.ADMIN_STAFF]: Users,
  [ROUTES.ADMIN_PATIENTS_NEW]: UserPlus,
  [ROUTES.ADMIN_REQUESTS]: Inbox,
  [ROUTES.ADMIN_PASSPORTS]: KeyRound,
  [ROUTES.ADMIN_FLAGGED]: Flag,
  [ROUTES.ADMIN_AUDIT]: ScrollText,
};

/** Persistent role-aware left navigation. Deep indigo shell per the Figma direction. */
export function Sidebar() {
  const { session, clearSession } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  if (!session) return null;
  const items = getNavItems(session.user.role);

  return (
    <aside className="flex w-72 shrink-0 flex-col bg-deep-indigo">
      <div className="border-b border-white/10 px-6 py-6">
        <p className="text-page-title font-bold text-white">MediTrust</p>
        <p className="mt-1 text-dense font-medium uppercase tracking-[0.18em] text-white/50">
          Zero-trust clinical
        </p>
      </div>

      <nav className="flex-1 px-3 py-4">
        <ul className="flex flex-col gap-1">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = NAV_ICONS[item.href] ?? LayoutDashboard;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-body-lg transition-colors ${
                    active
                      ? "bg-white/10 font-semibold text-white"
                      : "font-medium text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon size={18} className={active ? "text-white" : "text-white/60"} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-white/10 px-6 py-5">
        <p className="text-body-lg font-semibold text-white">{session.user.name}</p>
        <p className="mt-0.5 text-body text-white/60">
          {formatRole(session.user.role)} · {session.user.hospitalId}
        </p>
        <p className="identifier mt-1 text-dense text-white/50">{session.user.healthId}</p>
        <div className="mt-3">
          <SessionCountdown expiresAt={session.sessionExpiresAt} />
        </div>
        <button
          type="button"
          onClick={() => {
            clearSession();
            router.replace(ROUTES.LOGIN);
          }}
          className="mt-3 text-body font-medium text-white/60 transition-colors hover:text-white"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}