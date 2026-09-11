import { cn } from "@/lib/utils";

export type ProgressTone = "teal" | "amber" | "coral" | "indigo";

const TONES: Record<ProgressTone, string> = {
  teal: "bg-trust-teal",
  amber: "bg-amber-watch",
  coral: "bg-alert-coral",
  indigo: "bg-deep-indigo",
};

/** Hairline progress bar — the session TTL strip in the top bar, countdown drains.
 *  Tone follows the same meaning map as everything else (teal ok → amber soon → coral critical). */
export function Progress({
  value,
  tone = "teal",
  className,
}: {
  /** 0–100 */
  value: number;
  tone?: ProgressTone;
  className?: string;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-1 w-full overflow-hidden rounded-full bg-line/60", className)}
    >
      <div className={cn("h-full", TONES[tone])} style={{ width: `${clamped}%` }} />
    </div>
  );
}