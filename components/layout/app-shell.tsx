"use client";

/**
 * Persistent chrome: static sidebar on md+, drawer sidebar below md,
 * top bar with the session TTL strip. Content padding scales for mobile.
 */

import { useState, type ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { KeyboardShortcuts } from "./keyboard-shortcuts";

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-paper">
      {/* Desktop sidebar */}
      <Sidebar className="hidden md:flex" />

      {/* Mobile drawer */}
      {mobileNavOpen ? (
        <div className="fixed inset-0 z-85 md:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-ink/40"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-56 max-w-[85vw]">
            <Sidebar
              className="h-full w-full"
              onNavigate={() => setMobileNavOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onMenuClick={() => setMobileNavOpen(true)} />
        <KeyboardShortcuts />
        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">{children}</main>
      </div>
    </div>
  );
}