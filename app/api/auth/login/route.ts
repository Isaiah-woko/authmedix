import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validators";
import { issueLoginCode } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { writeAuditLog } from "@/lib/audit";
import { BCRYPT_ROUNDS } from "@/lib/auth";

const MAX_ATTEMPTS = 5;
// Pre-computed hash so unknown-user requests take the same time as real ones.
const DUMMY_HASH = bcrypt.hashSync("AuthMedix!DummyHash1", BCRYPT_ROUNDS);

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";

  const parsed = loginSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }
  const { healthId, email, password } = parsed.data;

  if (!rateLimit(`login:${healthId}:${ip}`, 10, 15 * 60_000).allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const user = await prisma.user.findFirst({ where: { healthId, email } });

  // Always run a bcrypt compare (anti-timing-enumeration).
  const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user) {
    await writeAuditLog({ userId: null, action: "LOGIN_FAILED", outcome: "DENIED", reason: "UNKNOWN_USER" });
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  if (user.status !== "ACTIVE") {
    return NextResponse.json({ locked: true }, { status: 403 });
  }

  if (!passwordOk) {
    const attempts = user.failedLoginAttempts + 1;
    const nowLocked = attempts >= MAX_ATTEMPTS;
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: attempts, ...(nowLocked ? { status: "LOCKED" as const } : {}) },
    });
    await writeAuditLog({
      userId: user.id, action: "LOGIN_FAILED", outcome: "DENIED",
      reason: nowLocked ? "ACCOUNT_LOCKED" : "INVALID_CREDENTIALS",
    });
    if (nowLocked) return NextResponse.json({ locked: true }, { status: 403 });
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  // Success: reset failures, issue OTP (hashed at rest).
  await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0 } });
  const code = await issueLoginCode(user.id);
  await sendOtpEmail(user.email, code);
  await writeAuditLog({ userId: user.id, action: "LOGIN_OTP_ISSUED", outcome: "ALLOWED" });

  return NextResponse.json({ codeSent: true });
}