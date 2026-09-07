import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/access-control";
import { prisma } from "@/lib/prisma";
import { reviewAuditSchema } from "@/lib/validators";
import { writeAuditLog } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireRole("ADMIN");
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const parsed = reviewAuditSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", details: parsed.error.flatten() }, { status: 400 });
  }

  const { reviewNote } = parsed.data;

  const passport = await prisma.accessPassport.findUnique({
    where: { id },
    include: { patient: true },
  });

  if (!passport || !passport.flagged) {
    return NextResponse.json({ error: "event_not_found_or_not_flagged" }, { status: 404 });
  }

  if (passport.patient.hospitalId !== admin.hospitalId) {
    return NextResponse.json({ error: "forbidden_cross_hospital" }, { status: 403 });
  }

  const updated = await prisma.accessPassport.update({
    where: { id },
    data: {
      reviewed: true,
      reviewedById: admin.id,
      reviewedAt: new Date(),
      reviewNote,
    },
  });

  await writeAuditLog({
    userId: admin.id,
    patientId: passport.patientId,
    action: "BREAK_GLASS_REVIEWED",
    outcome: "ALLOWED",
    reason: reviewNote || "Marked as reviewed",
  });

  return NextResponse.json(updated);
}