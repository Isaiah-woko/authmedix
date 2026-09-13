"use client";

/**
 * The ticking behind every visible countdown: passport panels, the OTP input,
 * the session TTL bar, the break-glass banner. Pure display — the actual
 * authority is always the server timestamp being counted down.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { formatHMS } from "@/lib/countdown";
import { OTP_TTL_MS } from "@/lib/constants";

export interface CountdownState {
  msLeft: number;
  /** H:MM:SS, clamped at 0:00:00 — the protocol's countdown format. */
  label: string;
  expired: boolean;
  /** Amber zone: under 15 minutes. */
  expiringSoon: boolean;
  /** Coral zone: under 5 minutes. */
  critical: boolean;
}

export function useCountdown(
  target: string | number | Date | null | undefined,
  onExpire?: () => void
): CountdownState {
  const targetMs =
    target === null || target === undefined ? null : new Date(target).getTime();
  const [now, setNow] = useState(() => Date.now());

  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  const firedRef = useRef(false);
  useEffect(() => {
    firedRef.current = false;
  }, [targetMs]);

  useEffect(() => {
    if (targetMs === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  const rawMsLeft = targetMs === null ? 0 : targetMs - now;
  const expired = targetMs !== null && rawMsLeft <= 0;

  useEffect(() => {
    if (expired && !firedRef.current) {
      firedRef.current = true;
      onExpireRef.current?.();
    }
  }, [expired]);

  const msLeft = Math.max(0, rawMsLeft);
  return {
    msLeft,
    label: formatHMS(msLeft),
    expired,
    expiringSoon: !expired && msLeft <= 15 * 60_000,
    critical: !expired && msLeft <= 5 * 60_000,
  };
}

/**
 * Login OTP special case (HANDOFF §0): the API never returns the code's expiry,
 * so we count down OTP_TTL_MS (5:00) from the moment login returned codeSent.
 * Pass the timestamp you recorded when the login call succeeded.
 */
export function useOtpCountdown(sentAt: number | Date | null): CountdownState {
  const deadline = useMemo(
    () => (sentAt ? new Date(sentAt).getTime() + OTP_TTL_MS : null),
    [sentAt]
  );
  return useCountdown(deadline);
}