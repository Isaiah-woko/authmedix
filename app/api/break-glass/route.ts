import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth, DURATION_MS } from "@/lib/access-control";
import { prisma } from "@/lib/prisma";
import { breakGlassSchema } from "@/lib/validators";
import { writeAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Protocol rule: Admin cannot break glass
  if (user.role === "ADMIN") {
    return NextResponse.json({ error: "forbidden_admin_cannot_break_glass" }, { status: 403 });
  }

  const parsed = breakGlassSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", details: parsed.error.flatten() }, { status: 400 });
  }

  const { patientId, reasonCategory, reasonDetail } = parsed.data;

  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) {
    return NextResponse.json({ error: "patient_not_found" }, { status: 404 });
  }

  // Break-glass grants the fixed Emergency Summary (all record types)
  const emergencyScope = ["NOTE", "LAB", "PRESCRIPTION", "UPLOAD"];

  const passport = await prisma.accessPassport.create({
    data: {
      type: "BREAK_GLASS",
      status: "ACTIVE",
      userId: user.id,
      patientId,
      purpose: `Emergency: ${reasonCategory}`,
      scope: emergencyScope,
      reasonCategory,
      reasonDetail,
      flagged: true,
      expiresAt: new Date(Date.now() + DURATION_MS.BREAK_GLASS),
      grantedById: null, // Self-invoked
    },
  });

  await writeAuditLog({
    userId: user.id,
    patientId,
    action: "BREAK_GLASS",
    outcome: "ALLOWED",
    reason: `Emergency access invoked: ${reasonCategory}`,
    flagged: true,
  });

  return NextResponse.json({
    passportId: passport.id,
    expiresAt: passport.expiresAt
  }, { status: 201 });
}