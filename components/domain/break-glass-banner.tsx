"use client";

/**
 * Full-width Coral strip shown whenever the active passport is BREAK_GLASS:
 * emergency mode must be impossible to miss, with the live 2h countdown in
 * mono right next to the scope reminder (never behind a click).
 */

import { AlertTriangle } from "lucide-react";
import { Countdown } from "./countdown";

export function BreakGlassBanner({ expiresAt }: { expiresAt: string }) {
  return (
    <div
      role="status"
      className="flex flex-col gap-2 rounded-sm border border-alert-coral/40 border-l-4 border-l-alert-coral bg-alert-coral-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-2 sm:items-center">
        <AlertTriangle className="h-4 w-4 shrink-0 text-alert-coral" aria-hidden="true" />
        <p className="text-body font-medium text-alert-coral">
          Emergency access active. Fixed Emergency Summary scope (all record types).
        </p>
      </div>
      <Countdown target={expiresAt} prefix="Expires in" className="text-body" />
    </div>
  );
}