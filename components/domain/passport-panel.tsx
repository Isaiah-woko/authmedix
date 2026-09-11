"use client";

/**
 * Compact passport summary for the dashboard list (Screen 4).
 * Shows type tag, patient identity, live countdown, and a Renew button
 * (omitted entirely for BREAK_GLASS — never disabled, just absent).
 */

import Link from "next/link";
import type { MyPassport } from "@/types";
import { isRenewable } from "@/lib/passport";
import { cn, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Countdown } from "./countdown";
import { PassportTypeTag } from "./passport-type-tag";
import { PatientIdentityCard } from "./patient-identity-card";

export function PassportPanel({
  passport,
  onRenew,
  renewLoading = false,
  className,
}: {
  passport: MyPassport;
  onRenew?: (passportId: string) => void;
  renewLoading?: boolean;
  className?: string;
}) {
  const renewable = isRenewable(passport);

  return (
    <Card className={cn("transition-colors", className)}>
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          {/* Left: patient + passport type */}
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <PassportTypeTag type={passport.type} />
              <Countdown target={passport.expiresAt} prefix="Expires in" />
            </div>

            <Link
              href={`/patients/${passport.patient.id}`}
              className="block hover:underline"
            >
              <PatientIdentityCard
                name={passport.patient.name}
                patientCode={passport.patient.patientCode}
                hospitalId={passport.patient.hospitalId}
              />
            </Link>

            <p className="text-data text-slate-ink">
              Purpose: {passport.purpose}
            </p>
            {passport.renewalCount > 0 ? (
              <p className="text-data text-slate-ink-soft">
                Renewed ×{passport.renewalCount}
              </p>
            ) : null}
          </div>

          {/* Right: actions */}
          <div className="flex shrink-0 items-center gap-2">
            <Link href={`/patients/${passport.patient.id}`}>
              <Button variant="outline" size="sm">
                View records
              </Button>
            </Link>
            {renewable && onRenew ? (
              <Button
                variant="trust"
                size="sm"
                loading={renewLoading}
                onClick={() => onRenew(passport.id)}
              >
                Renew
              </Button>
            ) : null}
          </div>
        </div>

        <p className="mt-2 text-data text-slate-ink-soft">
          Granted {formatDateTime(passport.createdAt)}
        </p>
      </CardContent>
    </Card>
  );
}