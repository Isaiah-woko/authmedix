"use client";

/**
 * Auth chrome router: Login gets the split brand layout (form left, story
 * right); every other auth screen (OTP, set-password, setup) stays a centered
 * single column. Keeps those pages untouched.
 */

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function AuthShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return <div className="min-h-screen bg-paper">{children}</div>;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4 py-6 sm:px-6 sm:py-10">
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}