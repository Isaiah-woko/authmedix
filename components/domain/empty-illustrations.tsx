import { cn } from "@/lib/utils";

/** Calm Slate line illustrations for empty states — empty is a normal
 *  operating condition here, never an error. Sized by className. */

function base(className?: string) {
  return cn("h-12 w-12", className);
}

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function EmptyPassportsIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={base(className)} aria-hidden="true" {...stroke}>
      <rect x="9" y="7" width="26" height="34" rx="3" />
      <rect x="17" y="4" width="14" height="6" rx="2" />
      <circle cx="22" cy="26" r="7" />
      <path d="M22 22v4l3 2" />
    </svg>
  );
}

export function EmptySearchIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={base(className)} aria-hidden="true" {...stroke}>
      <circle cx="20" cy="20" r="10" />
      <path d="M27.5 27.5L38 38" />
      <path d="M16 20h8" strokeDasharray="2 3" />
    </svg>
  );
}

export function EmptyQueueIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={base(className)} aria-hidden="true" {...stroke}>
      <path d="M6 26l6-16h24l6 16v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V26z" />
      <path d="M6 26h10l2 4h12l2-4h10" />
      <path d="M19 34l3.5 3.5L29 31" />
    </svg>
  );
}

export function EmptyFlagIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={base(className)} aria-hidden="true" {...stroke}>
      <path d="M12 42V8" />
      <path d="M12 8h22l-4 6 4 6H12" />
      <circle cx="33" cy="33" r="8" />
      <path d="M30 33l2.5 2.5L37 31" />
    </svg>
  );
}

export function EmptyRosterIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={base(className)} aria-hidden="true" {...stroke}>
      <rect x="6" y="10" width="36" height="28" rx="3" />
      <circle cx="17" cy="22" r="4" />
      <path d="M11 32c1.5-4 4-6 6-6s4.5 2 6 6" />
      <path d="M31 20v8M27 24h8" />
    </svg>
  );
}