"use client";

import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { useRequireAuth } from "@/hooks/use-require-auth";

/** Shell for every protected screen: sidebar + content column.
 *  One guard here replaces per-page guards for all routes inside (app). */
export default function AppLayout({ children }: { children: ReactNode }) {
  const { session, isHydrated } = useRequireAuth();

  if (!isHydrated || !session) return null;

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar />
      <main className="min-w-0 flex-1 px-8 py-6">{children}</main>
    </div>
  );
}