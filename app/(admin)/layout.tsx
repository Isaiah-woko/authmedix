import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { RoleGate } from "@/components/layout/role-gate";

/** Admin-only route group. UX gate only — admin APIs enforce Admin server-side. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGate allow="ADMIN">
      <AppShell>{children}</AppShell>
    </RoleGate>
  );
}