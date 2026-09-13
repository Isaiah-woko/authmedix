import type { UserStatus } from "@/types";
import { Badge, type BadgeTone } from "@/components/ui/badge";

/** ACTIVE → Teal (normal trust) · SUSPENDED → Slate (inactive) · LOCKED → Coral (denied). */
const STATUS_CONFIG: Record<UserStatus, { label: string; tone: BadgeTone }> = {
  ACTIVE: { label: "Active", tone: "teal" },
  SUSPENDED: { label: "Suspended", tone: "slate" },
  LOCKED: { label: "Locked", tone: "coral" },
};

export function StaffStatusBadge({ status }: { status: UserStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge tone={config.tone}>{config.label}</Badge>;
}