import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/access-control";
import { prisma } from "@/lib/prisma";
import { revokePassportSchema } from "@/lib/validators";
import { writeAuditLog } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireRole("ADMIN");
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const parsed = revokePassportSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", details: parsed.error.flatten() }, { status: 400 });
  }

  const { revokeReason } = parsed.data;

  const passport = await prisma.accessPassport.findUnique({
    where: { id },
    include: { patient: true },
  });

  if (!passport) {
    return NextResponse.json({ error: "passport_not_found" }, { status: 404 });
  }

  if (passport.type === "BREAK_GLASS") {
    return NextResponse.json({ error: "break_glass_cannot_be_revoked" }, { status: 400 });
  }

  if (passport.status !== "ACTIVE") {
    return NextResponse.json({ error: "passport_already_inactive" }, { status: 400 });
  }

  // Admin can only revoke passports for patients in their hospital
  if (passport.patient.hospitalId !== admin.hospitalId) {
    return NextResponse.json({ error: "forbidden_cross_hospital" }, { status: 403 });
  }

  const updated = await prisma.accessPassport.update({
    where: { id },
    data: {
      status: "REVOKED",
      revokedById: admin.id,
      revokedAt: new Date(),
      revokeReason,
    },
  });

  await writeAuditLog({
    userId: admin.id,
    patientId: passport.patientId,
    action: "PASSPORT_REVOKED",
    outcome: "ALLOWED",
    reason: `Revoked: ${revokeReason}`,
  });

  return NextResponse.json(updated);
}