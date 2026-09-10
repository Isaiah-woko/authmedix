import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth, requireRole } from "@/lib/access-control";
import { prisma } from "@/lib/prisma";
import { createPassportRequestSchema } from "@/lib/validators";
import { writeAuditLog } from "@/lib/audit";
import { getVisibleFields } from "@/lib/role-fields";

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = createPassportRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", details: parsed.error.flatten() }, { status: 400 });
  }

  let { patientId, purpose, scope } = parsed.data;

  // Pre-fill sensible defaults from the user's role if the client didn't send them
  if (!purpose) {
    const roleDefaults: Record<string, string> = {
      DOCTOR: "Clinical assessment and treatment",
      NURSE: "Patient care and monitoring",
      PHARMACIST: "Medication review and dispensing",
      LAB: "Laboratory testing and results review",
    };
    purpose = roleDefaults[user.role] || "Clinical access";
  }

  if (!scope || scope.length === 0) {
    const visibility = getVisibleFields(user.role);
    scope = [];
    if (visibility.notes !== "hidden") scope.push("NOTE");
    if (visibility.labs !== "hidden") scope.push("LAB");
    if (visibility.prescriptions !== "hidden") scope.push("PRESCRIPTION");
    if (visibility.uploads !== "hidden") scope.push("UPLOAD");
  }

  // Ensure the patient exists
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) {
    return NextResponse.json({ error: "patient_not_found" }, { status: 404 });
  }

  const request = await prisma.passportRequest.create({
    data: {
      requesterId: user.id,
      patientId,
      purpose,
      scope,
      status: "PENDING",
    },
  });

  await writeAuditLog({
    userId: user.id,
    patientId,
    action: "REQUEST_ACCESS",
    outcome: "ALLOWED",
    reason: `Requested access for ${purpose}`,
  });

  return NextResponse.json(request, { status: 201 });
}

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const statusFilter = req.nextUrl.searchParams.get("status") ?? undefined;

  let whereClause: any = {};
  if (statusFilter) whereClause.status = statusFilter;

  if (user.role === "ADMIN") {
    // Admin sees pending requests for patients in their hospital
    whereClause.patient = { hospitalId: user.hospitalId };
  } else {
    // Clinical workers only see their own requests
    whereClause.requesterId = user.id;
  }

  const requests = await prisma.passportRequest.findMany({
    where: whereClause,
    include: {
      requester: { select: { id: true, name: true, role: true, healthId: true } },
      patient: { select: { id: true, name: true, patientCode: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(requests);
}