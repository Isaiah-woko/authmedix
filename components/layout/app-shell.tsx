"use client";

/**
 * Persistent chrome: static sidebar on md+, drawer sidebar below md,
 * top bar with the session TTL strip.
 *
 * Layout is now locked to the viewport height (h-screen). Only the main
 * content area scrolls; the sidebar and top bar remain fixed in view.
 */

import { useState, type ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-paper">
      {/* Desktop sidebar */}
      <Sidebar className="hidden md:flex md:shrink-0" />

      {/* Mobile drawer */}
      {mobileNavOpen ? (
        <div
          className="fixed inset-0 z-[85] md:hidden"
          role="dialog"
          aria-modal="true"
        >
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

      <div className="flex min-w-0 flex-1 min-h-0 flex-col">
        <TopBar onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 sm:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
