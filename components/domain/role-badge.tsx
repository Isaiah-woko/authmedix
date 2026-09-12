import type { Role } from "@/types";
import { roleLabel } from "@/lib/role";
import { Badge } from "@/components/ui/badge";

/** Subtle Slate role indicator — used on record authors. Roles carry no
 *  color meaning in the design system, so this stays neutral. */
export function RoleBadge({ role, className }: { role: Role; className?: string }) {
  return (
    <Badge tone="slate" className={className}>
      {roleLabel(role)}
    </Badge>
  );
}