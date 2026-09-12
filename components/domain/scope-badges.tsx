import { cn } from "@/lib/utils";
import { RECORD_TYPE_LABELS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";

/** Scope arrays rendered as neutral Slate badges — scope carries no
 *  meaning-color in the design system; unknown values render verbatim. */
export function ScopeBadges({ scope, className }: { scope: string[]; className?: string }) {
  if (scope.length === 0) {
    return <span className="text-data text-slate-ink-soft">No scope</span>;
  }
  return (
    <span className={cn("flex flex-wrap gap-1", className)}>
      {scope.map((entry) => (
        <Badge key={entry} tone="slate">
          {RECORD_TYPE_LABELS[entry] ?? entry}
        </Badge>
      ))}
    </span>
  );
}