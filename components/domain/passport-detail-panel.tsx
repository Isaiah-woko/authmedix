"use client";

/**
 * The record view's passport panel: type tag, live countdown, expiry moment,
 * duration line, renewal count, and the Renew button — OMITTED entirely for
 * BREAK_GLASS (never disabled), per HANDOFF §3.7.
 *
 * Note: the patient-view passport payload carries only { id, type, expiresAt,
 * renewalCount } (HANDOFF §3.4), so STANDARD can't show "8h vs 24h" exactly —
 * fixed types state their protocol duration; STANDARD shows the window copy.
 */

import type { PatientViewPassport } from "@/types";
import { isRenewable } from "@/lib/passport";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Countdown } from "./countdown";
import { PassportTypeTag } from "./passport-type-tag";

export function PassportDetailPanel({
  passport,
  onRenew,
  renewLoading = false,
}: {
  passport: PatientViewPassport;
  onRenew: () => void;
  renewLoading?: boolean;
}) {
  // On allow, the passport is ACTIVE by definition (checkAccess proved it).
  const renewable = isRenewable({
    type: passport.type,
    status: "ACTIVE",
    expiresAt: passport.expiresAt,
  });

  const durationLine =
    passport.type === "REFERRAL"
      ? "48 hours, fixed"
      : passport.type === "BREAK_GLASS"
        ? "2 hours, fixed"
        : "Standard clinical window";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-body">Access passport</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <PassportTypeTag type={passport.type} />

        <div>
          <Countdown target={passport.expiresAt} prefix="Expires in" className="text-section" />
          <p className="mt-1 text-data text-slate-ink">
            Expires {formatDateTime(passport.expiresAt)}
          </p>
        </div>

        <p className="text-data text-slate-ink">{durationLine}</p>

        {passport.renewalCount > 0 ? (
          <p className="text-data text-slate-ink-soft">Renewed ×{passport.renewalCount}</p>
        ) : null}

        {passport.type === "BREAK_GLASS" ? (
          <>
            <Badge tone="coral">Emergency Summary scope</Badge>
            <p className="text-data text-slate-ink">
              Not renewable. Invoke Break-Glass again only if a new emergency requires it.
            </p>
          </>
        ) : null}

        {renewable ? (
          <Button
            variant="trust"
            size="sm"
            className="w-full"
            loading={renewLoading}
            onClick={onRenew}
          >
            Renew
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}