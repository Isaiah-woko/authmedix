import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validators"; // <-- Uncommented
import { issueLoginCode } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/email";
import { authLimiter, getClientIp } from "@/lib/rate-limit";
import { writeAuditLog } from "@/lib/audit";
import { BCRYPT_ROUNDS } from "@/lib/auth";

const MAX_ATTEMPTS = 5;
// Pre-computed hash so unknown-user requests take the same time as real ones.
const DUMMY_HASH = bcrypt.hashSync("AuthMedix!DummyHash1", BCRYPT_ROUNDS);

export async function POST(request: Request) {
  const body = await request.json();

  // 1. Validate payload shape first
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const { healthId, email, password } = parsed.data;

  // 2. Rate limiting
  const ip = getClientIp(request.headers);
  const identifier = `${ip}:${healthId}`;
  const { success, limit, reset, remaining } = await authLimiter.limit(identifier);

  if (!success) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: "Too many login attempts. Please try again later.",
        retryAfter: Math.ceil((reset - Date.now()) / 1000),
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

  // 3. Anti-enumeration lookup & compare
  const user = await prisma.user.findFirst({ where: { healthId, email } });
  const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user) {
    await writeAuditLog({ userId: null, action: "LOGIN_FAILED", outcome: "DENIED", reason: "UNKNOWN_USER" });
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  // 4. Explicit status checks
  if (user.status === "LOCKED") {
    return NextResponse.json({ locked: true }, { status: 403 });
  }
  if (user.status === "SUSPENDED") {
    return NextResponse.json({ error: "account_suspended" }, { status: 403 });
  }

  // 5. Handle bad password
  if (!passwordOk) {
    const attempts = user.failedLoginAttempts + 1;
    const nowLocked = attempts >= MAX_ATTEMPTS;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: attempts,
        ...(nowLocked ? { status: "LOCKED" as const } : {})
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: "LOGIN_FAILED",
      outcome: "DENIED",
      reason: nowLocked ? "ACCOUNT_LOCKED" : "INVALID_CREDENTIALS",
    });

    if (nowLocked) return NextResponse.json({ locked: true }, { status: 403 });
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  // 6. Success path
  await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0 } });
  const code = await issueLoginCode(user.id);
  await sendOtpEmail(user.email, code);
  await writeAuditLog({ userId: user.id, action: "LOGIN_OTP_ISSUED", outcome: "ALLOWED" });

  return NextResponse.json({ codeSent: true });
}