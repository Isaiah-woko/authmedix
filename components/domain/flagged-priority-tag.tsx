import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/** Amber "high priority" marker for flagged events carrying the protocol's
 *  repeat-use signal (same worker, >1 break-glass event). Static by design —
 *  the design system reserves motion for confirming actions. */
export function FlaggedPriorityTag() {
  return (
    <Badge tone="amber">
      <AlertTriangle className="h-3 w-3" aria-hidden="true" />
      High priority
    </Badge>
  );
}