import { cn } from "@/lib/utils";

/** Loading placeholder — pulse is the one allowed "something is happening" motion. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-sm bg-paper-dim", className)} />;
}