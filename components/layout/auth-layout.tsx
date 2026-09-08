import type { ReactNode } from "react";

/** Centered, sidebar-free shell for Login / OTP / Set Password.
 *  No card: content sits directly on the paper background, left-aligned. */
export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4 py-10">
      <div className="w-full max-w-md">
        <p className="text-page-title font-semibold text-deep-indigo">MediTrust</p>
        <h1 className="mt-6 text-page-title font-bold text-ink">{title}</h1>
        {subtitle ? <p className="mt-2 text-body-lg text-slate">{subtitle}</p> : null}
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}