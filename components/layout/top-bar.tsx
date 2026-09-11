"use client";

/**
 * User chip + role badge + ambient session TTL strip (drains over the
 * role-based TTL from sessionExpiresAt; Teal → Amber <15m → Coral <5m).
 * Responsive: menu button appears below md; the "Session ends in" label and
 * role badge collapse away on narrow screens.
 */

import { Menu } from "lucide-react";
import { useCountdown } from "@/hooks/use-countdown";
import { useSession } from "@/hooks/use-session";
import { signOut } from "@/lib/auth-client";
import { roleLabel } from "@/lib/role";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Progress, type ProgressTone } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export function TopBar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { session, user, isLoading } = useSession();
  const countdown = useCountdown(user?.sessionExpiresAt ?? null);

  if (isLoading || !user || !session) {
    return (
      <header className="flex h-14 items-center justify-between border-b border-line bg-white px-4 sm:px-6">
        <Skeleton className="h-8 w-40 sm:w-48" />
        <Skeleton className="h-8 w-24 sm:w-64" />
      </header>
    );
  }

  const totalMs =
    new Date(session.user.sessionExpiresAt).getTime() - new Date(session.issuedAt).getTime();
  const percent = totalMs > 0 ? (countdown.msLeft / totalMs) * 100 : 0;

  const tone: ProgressTone = countdown.critical
    ? "coral"
    : countdown.expiringSoon
      ? "amber"
      : "teal";
  const toneText = countdown.critical
    ? "text-alert-coral"
    : countdown.expiringSoon
      ? "text-amber-watch"
      : "text-trust-teal";

  return (
    <header className="flex h-14 items-center justify-between gap-3 border-b border-line bg-white px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {onMenuClick ? (
          <IconButton
            variant="ghost"
            label="Open navigation"
            className="md:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </IconButton>
        ) : null}
        <div className="min-w-0">
          <p className="truncate text-body font-medium text-ink">{user.name}</p>
          <p className="mono truncate text-data text-slate-ink">{user.healthId}</p>
        </div>
        <Badge tone="slate" className="hidden sm:inline-flex">
          {roleLabel(user.role)}
        </Badge>
      </div>

      <div className="flex shrink-0 items-center gap-3 sm:gap-5">
        <div className="w-24 sm:w-48" aria-label="Session time remaining">
          <div className="flex items-center justify-between">
            <span className="hidden text-data text-slate-ink sm:inline">Session ends in</span>
            <span
              className={cn(
                "mono text-data",
                toneText,
                countdown.critical && "animate-pulse-soft"
              )}
            >
              {countdown.label}
            </span>
          </div>
          <Progress value={percent} tone={tone} className="mt-1" />
        </div>
        <Button variant="outline" size="sm" onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
    </header>
  );
}