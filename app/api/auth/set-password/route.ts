import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { issueSessionToken, SESSION_COOKIE_NAME, BCRYPT_ROUNDS } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { setPasswordSchema } from "@/lib/validators";
import { writeAuditLog } from "@/lib/audit";
import { requireSessionForPasswordChange } from "@/lib/access-control";

export async function POST(req: NextRequest) {
   const user = await requireSessionForPasswordChange();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = setPasswordSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "weak_password", details: parsed.error.flatten() }, { status: 400 });
  }
  const { newPassword, currentPassword } = parsed.data;

  // (No need to fetch `user` again, the helper already returned the full DB user object)
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!user.mustChangePassword) {
    // Voluntary mode: must prove knowledge of the current password.
    if (!currentPassword) {
      return NextResponse.json({ error: "current_password_required" }, { status: 400 });
    }
    const currentOk = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!currentOk) {
      await writeAuditLog({ userId: user.id, action: "PASSWORD_CHANGE_FAILED", outcome: "DENIED" });
      return NextResponse.json({ error: "invalid_current_password" }, { status: 401 });
    }
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
   await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      mustChangePassword: false,
      sessionInvalidatedAt: null 
    }
  });
  await writeAuditLog({ userId: user.id, action: "PASSWORD_CHANGED", outcome: "ALLOWED" });

  // Re-issue the session with mustChangePassword now false.
  const { token, sessionExpiresAt, cookieOptions } = await issueSessionToken({
    id: user.id, healthId: user.healthId, role: user.role,
    hospitalId: user.hospitalId, sessionTtlHrs: user.sessionTtlHrs,
    mustChangePassword: false,
  });

  const res = NextResponse.json({ ok: true, sessionExpiresAt });
  res.cookies.set(SESSION_COOKIE_NAME, token, cookieOptions);
  return res;
}