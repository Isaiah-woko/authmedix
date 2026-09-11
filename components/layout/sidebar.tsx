"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { useCountdown } from "@/hooks/use-countdown";
import { formatCountdownHMS } from "@/lib/dates";
import { formatRole } from "@/lib/format";
import { useSession } from "@/providers/session-provider";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const CLINICAL_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/search", label: "Patient Search", icon: Search },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/staff", label: "Staff", icon: Users },
  { href: "/admin/patients/new", label: "Patients", icon: UserPlus },
  { href: "/admin/requests", label: "Requests Queue", icon: Inbox },
  { href: "/admin/passports", label: "Grant Passport / Referral", icon: KeyRound },
  { href: "/admin/flagged", label: "Flagged Review", icon: Flag },
  { href: "/admin/audit", label: "Audit Log", icon: ScrollText },
];

function SessionCountdown({ expiresAt }: { expiresAt: string }) {
  const remaining = useCountdown(expiresAt);
  const expired = remaining?.isExpired === true;
  const soon = !expired && (remaining?.totalSeconds ?? 0) <= 30 * 60;
  const tone = expired ? "text-alert-coral" : soon ? "text-amber-watch" : "text-trust-teal";
  return (
    <p className="text-dense text-white/60">
      Session ends in <span className={`identifier ${tone}`}>{formatCountdownHMS(expiresAt)}</span>
    </p>
  );
}

export function Sidebar() {
  const { session, signOut } = useSession();
  const pathname = usePathname();

  if (!session) return null;

  const nav = session.user.role === "ADMIN" ? ADMIN_NAV : CLINICAL_NAV;

  return (
    <aside className="flex min-h-screen w-64 shrink-0 flex-col bg-deep-indigo">
      <div className="px-5 py-6">
        <p className="text-page-title font-semibold text-white">MediTrust</p>
        <p className="mt-1 text-dense tracking-wide text-white/60">Zero-trust clinical</p>
      </div>

      <nav className="flex-1 px-3">
        <ul className="flex flex-col gap-1">
          {nav.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded px-3 py-2 text-body transition-colors ${
                    active
                      ? "bg-white/10 font-medium text-white"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-white/10 px-5 py-4">
        <p className="text-body font-medium text-white">{formatRole(session.user.role)}</p>
        <p className="identifier mt-0.5 text-dense text-white/60">{session.user.healthId}</p>
        <div className="mt-2">
          <SessionCountdown expiresAt={session.user.sessionExpiresAt} />
        </div>
        <button
          type="button"
          onClick={() => {
            void signOut();
          }}
          className="mt-3 text-body text-white/70 transition-colors hover:text-white"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}