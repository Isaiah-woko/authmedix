import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/access-control";
import { prisma } from "@/lib/prisma";
import { denyRequestSchema } from "@/lib/validators";
import { writeAuditLog } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireRole("ADMIN");
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const parsed = denyRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", details: parsed.error.flatten() }, { status: 400 });
  }

  const { denialReason } = parsed.data;

  const request = await prisma.passportRequest.findUnique({
    where: { id },
    include: { patient: true },
  });

  if (!request || request.status !== "PENDING") {
    return NextResponse.json({ error: "request_not_found_or_already_reviewed" }, { status: 404 });
  }

  if (request.patient.hospitalId !== admin.hospitalId) {
    return NextResponse.json({ error: "forbidden_cross_hospital" }, { status: 403 });
  }

  await prisma.passportRequest.update({
    where: { id },
    data: {
      status: "DENIED",
      reviewedById: admin.id,
      reviewedAt: new Date(),
      denialReason,
    },
  });

  await writeAuditLog({
    userId: admin.id,
    patientId: request.patientId,
    action: "PASSPORT_REQUEST_DENIED",
    outcome: "ALLOWED",
    reason: `Denied: ${denialReason}`,
  });

  return NextResponse.json({ ok: true });
}