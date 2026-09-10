import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/access-control";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireRole("ADMIN");
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "user_not_found" }, { status: 404 });

  if (target.hospitalId !== admin.hospitalId) {
    return NextResponse.json({ error: "forbidden_cross_hospital" }, { status: 403 });
  }

  if (target.id === admin.id) {
    return NextResponse.json({ error: "cannot_force_reset_self" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id },
    data: { mustChangePassword: true, sessionInvalidatedAt: new Date() },
  });

  await writeAuditLog({
    userId: admin.id,
    action: "PASSWORD_RESET_FORCED",
    outcome: "ALLOWED",
    reason: `Forced reset + session invalidation for ${target.healthId}`,
  });

  return NextResponse.json({ ok: true, healthId: target.healthId });
}