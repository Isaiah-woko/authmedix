import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCodeSchema } from "@/lib/validators";
import { verifyLoginCode, hasUsableLoginCode } from "@/lib/otp";
import { writeAuditLog } from "@/lib/audit";
import { issueSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { authLimiter, getClientIp } from "@/lib/rate-limit";

const MAX_ATTEMPTS = 5;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);

  const parsed = verifyCodeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const { healthId, code } = parsed.data;

  // UPSTASH RATE LIMITING
  const identifier = `${ip}:${healthId}`;
  const { success, limit, reset, remaining } = await authLimiter.limit(identifier);

  if (!success) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: "Too many verification attempts. Please try again later.",
        retryAfter: Math.ceil((reset - Date.now()) / 1000) // seconds until reset
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
        },
      }
    );
  }
  // --- END RATE LIMITING ---

  const user = await prisma.user.findUnique({ where: { healthId } });
  if (!user) return NextResponse.json({ error: "invalid_code" }, { status: 401 });
  if (user.status !== "ACTIVE") return NextResponse.json({ locked: true }, { status: 403 });

  // Lockout-DoS guard: don't count failures unless a code was actually issued.
  const hasPending = await hasUsableLoginCode(user.id);
  if (!hasPending) {
    await writeAuditLog({ userId: user.id, action: "VERIFY_CODE_FAILED", outcome: "DENIED", reason: "NO_PENDING_CODE" });
    return NextResponse.json({ error: "invalid_code" }, { status: 401 });
  }

  const ok = await verifyLoginCode(user.id, code);
  if (!ok) {
    const attempts = user.failedLoginAttempts + 1;
    const nowLocked = attempts >= MAX_ATTEMPTS;
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: attempts, ...(nowLocked ? { status: "LOCKED" as const } : {}) },
    });
    await writeAuditLog({
      userId: user.id, action: "VERIFY_CODE_FAILED", outcome: "DENIED",
      reason: nowLocked ? "ACCOUNT_LOCKED" : "INVALID_CODE",
    });
    if (nowLocked) return NextResponse.json({ locked: true }, { status: 403 });
    return NextResponse.json({ error: "invalid_code" }, { status: 401 });
  }

  // Success: reset failures and issue the session.
  await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0 } });
  const { token, sessionExpiresAt, cookieOptions } = await issueSessionToken({
    id: user.id, healthId: user.healthId, role: user.role,
    hospitalId: user.hospitalId, sessionTtlHrs: user.sessionTtlHrs,
    mustChangePassword: user.mustChangePassword,
  });
  await writeAuditLog({ userId: user.id, action: "LOGIN_SUCCESS", outcome: "ALLOWED" });

  const res = NextResponse.json({ ok: true, mustChangePassword: user.mustChangePassword, sessionExpiresAt });
  res.cookies.set(SESSION_COOKIE_NAME, token, cookieOptions);
  return res;
}