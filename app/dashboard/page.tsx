"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useCountdown } from "@/hooks/use-countdown";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { formatCountdownHMS } from "@/lib/dates";
import { formatRole } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import { useSession } from "@/providers/session-provider";

export default function DashboardPage() {
  const { session, isHydrated } = useRequireAuth();
  const { clearSession } = useSession();
  const router = useRouter();
  const remaining = useCountdown(session?.sessionExpiresAt ?? null);

  if (!isHydrated || !session) return null;

  const expiringSoon =
    remaining !== null && !remaining.isExpired && remaining.totalSeconds <= 30 * 60;

  return (
    <main className="min-h-screen bg-paper p-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-page-title text-ink">Dashboard</h1>
        <Button
          variant="secondary"
          onClick={() => {
            clearSession();
            router.replace(ROUTES.LOGIN);
          }}
        >
          Sign out
        </Button>
      </header>

      <section className="max-w-md rounded border border-section-line bg-white p-6">
        <p className="text-section-header text-ink">{session.user.name}</p>
        <p className="mt-1 text-body text-slate">
          {formatRole(session.user.role)} · {session.user.hospitalId}
        </p>
        <p className="identifier mt-1 text-dense text-slate">{session.user.healthId}</p>
        <p className="mt-4 text-body text-slate">
          Session expires in{" "}
          <span className={`identifier ${expiringSoon ? "text-amber-watch" : "text-trust-teal"}`}>
            {formatCountdownHMS(session.sessionExpiresAt)}
          </span>
        </p>
        <p className="mt-4 text-dense text-slate">
          The real dashboard (active passports for clinical roles, working queues for Admin)
          arrives in Phase 4. This stub exists so the login flow can be tested end to end.
        </p>
      </section>
    </main>
  );
}