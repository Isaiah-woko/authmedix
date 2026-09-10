import { NextResponse } from "next/server";
import { requireRole } from "@/lib/access-control";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const admin = await requireRole("ADMIN");
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const [staffCount, patientCount, pendingRequests, unreviewedFlagged] = await prisma.$transaction([
    prisma.user.count({ where: { hospitalId: admin.hospitalId } }),
    prisma.patient.count({ where: { hospitalId: admin.hospitalId } }),
    prisma.passportRequest.count({ where: { status: "PENDING", patient: { hospitalId: admin.hospitalId } } }),
    prisma.accessPassport.count({ where: { flagged: true, reviewed: false, patient: { hospitalId: admin.hospitalId } } }),
  ]);

  return NextResponse.json({ staffCount, patientCount, pendingRequests, unreviewedFlagged });
}