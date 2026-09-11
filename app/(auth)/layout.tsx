import type { ReactNode } from "react";

/** Centered, sidebar-free chrome for Login / OTP / Set Password. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4 py-6 sm:px-6 sm:py-10">
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}