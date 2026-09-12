import type { ReactNode } from "react";
import { AuthShell } from "@/components/layout/auth-shell";

/** Sidebar-free chrome for Login / OTP / Set Password / Setup. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthShell>{children}</AuthShell>;
}