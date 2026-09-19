import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

// Must exactly match the cookie name you set in lib/auth.ts
const SESSION_COOKIE_NAME = "authmedix.session-token";

export async function POST() {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  if (userId) {
    // Best-effort audit. If the DB write fails, we still MUST log the user out.
    await writeAuditLog({ userId, action: "LOGOUT", outcome: "ALLOWED" }).catch(() => {});
  }

  const res = NextResponse.json({ ok: true });

  // Delete the cookie by setting maxAge to 0
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return res;
}