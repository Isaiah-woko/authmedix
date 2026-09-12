import { NextResponse } from "next/server";
import { auth, SESSION_COOKIE_NAME } from "@/lib/auth";

const PUBLIC_PATH_PREFIXES = [
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/verify-code",
  "/api/auth/callback",
  "/api/auth/csrf",
  "/api/auth/session",
  "/api/auth/signout",
  "/api/bootstrap",
  "/setup",
  "/api/bootstrap/status",
  "/login",
  "/otp",
];

const SET_PASSWORD_PATHS = ["/api/auth/set-password", "/set-password"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  if (pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  const isPublic = PUBLIC_PATH_PREFIXES.some((p) => pathname.startsWith(p));

  // mustChangePassword gate: only set-password + auth flow are reachable.
  if (session?.user?.mustChangePassword) {
    const allowed =
      SET_PASSWORD_PATHS.includes(pathname) ||
      pathname.startsWith("/api/auth") ||
      isPublic;
    if (!allowed) {
      if (pathname.startsWith("/api")) {
        return NextResponse.json({ error: "password_change_required" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/set-password", req.url));
    }
    return NextResponse.next();
  }

  if (isPublic) return NextResponse.next();

  if (!session) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Continuous TTL check — force re-login on expiry.
  const expiresAt = session.user.sessionExpiresAt ? new Date(session.user.sessionExpiresAt) : null;
  if (expiresAt && expiresAt <= new Date()) {
    const res = pathname.startsWith("/api")
      ? NextResponse.json({ error: "session_expired" }, { status: 401 })
      : NextResponse.redirect(new URL("/login", req.url));
    res.cookies.delete(SESSION_COOKIE_NAME);
    return res;
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};