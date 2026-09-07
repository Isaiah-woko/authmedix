import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth, checkAccess } from "@/lib/access-control";
import { prisma } from "@/lib/prisma";
import type { RecordType } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: patientId } = await params;

  const access = await checkAccess({
    userId: user.id,
    patientId,
    action: "VIEW_PATIENT",
  });

  if (!access.allowed) {
    return NextResponse.json({ reason: access.denyReason }, { status: 403 });
  }

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: {
      id: true,
      patientCode: true,
      name: true,
      dob: true,
      allergies: true,
      records: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          content: true,
          createdAt: true,
          author: { select: { id: true, name: true, role: true } },
        }
      }
    }
  });

  if (!patient) {
    return NextResponse.json({ error: "patient_not_found" }, { status: 404 });
  }

  // Filter records based on visibility map returned by checkAccess
  const visibility = access.visibility!;
  const hiddenTypes: RecordType[] = [];
  if (visibility.notes === "hidden") hiddenTypes.push("NOTE");
  if (visibility.labs === "hidden") hiddenTypes.push("LAB");
  if (visibility.prescriptions === "hidden") hiddenTypes.push("PRESCRIPTION");
  if (visibility.uploads === "hidden") hiddenTypes.push("UPLOAD");

  const filteredRecords = patient.records.filter(r => !hiddenTypes.includes(r.type));

  // Conditionally include allergies based on visibility.allergies
  const showAllergies = visibility.allergies !== "hidden";

  return NextResponse.json({
    id: patient.id,
    patientCode: patient.patientCode,
    name: patient.name,
    dob: patient.dob,
    allergies: showAllergies ? patient.allergies : undefined,
    records: filteredRecords,
    passport: access.passport ? {
      id: access.passport.id,
      type: access.passport.type,
      expiresAt: access.passport.expiresAt,
      renewalCount: access.passport.renewalCount,
    } : undefined,
  });
}