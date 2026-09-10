import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth, requireRole, DURATION_MS } from "@/lib/access-control";
import { prisma } from "@/lib/prisma";
import { registerPatientSchema } from "@/lib/validators";
import { generatePatientCode } from "@/lib/id-generators";
import { writeAuditLog } from "@/lib/audit";
import type { Prisma } from "@prisma/client"; // Added Prisma type import

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const query = req.nextUrl.searchParams.get("query")?.trim().toLowerCase() ?? "";

  // Replaced `any` with Prisma's strict type for Patient queries
  const whereClause: Prisma.PatientWhereInput = query ? {
    OR: [
      { name: { contains: query, mode: "insensitive" } },
      { patientCode: { contains: query, mode: "insensitive" } },
    ]
  } : {};

  // Identity-only search. Cross-hospital to support referrals.
  const patients = await prisma.patient.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      patientCode: true,
      hospitalId: true,
    },
    take: 50,
    orderBy: { name: "asc" },
  });

  return NextResponse.json(patients);
}

export async function POST(req: NextRequest) {
  const admin = await requireRole("ADMIN");
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = registerPatientSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", details: parsed.error.flatten() }, { status: 400 });
  }

  const { name, dob, allergies, careTeam } = parsed.data;

  const hospital = await prisma.hospital.findUnique({ where: { id: admin.hospitalId } });
  if (!hospital) return NextResponse.json({ error: "hospital_not_found" }, { status: 500 });

  // Collision handling for patient code
  let patientCode = generatePatientCode(hospital.code);
  while (await prisma.patient.findUnique({ where: { patientCode } })) {
    patientCode = generatePatientCode(hospital.code);
  }

  // Transaction: create patient + care team passports atomically
  const patient = await prisma.$transaction(async (tx) => {
    const newPatient = await tx.patient.create({
      data: {
        patientCode,
        name,
        dob,
        allergies: allergies ?? [],
        hospitalId: admin.hospitalId,
      },
    });

    if (careTeam && careTeam.length > 0) {
      const memberIds = careTeam.map(m => m.userId);
      const validMembers = await tx.user.findMany({
        where: { id: { in: memberIds }, status: "ACTIVE" },
        select: { id: true }
      });

      if (validMembers.length !== memberIds.length) {
        throw new Error("INVALID_CARE_TEAM_MEMBER");
      }

      await tx.accessPassport.createMany({
        data: careTeam.map(member => ({
          userId: member.userId,
          patientId: newPatient.id,
          type: "STANDARD" as const,
          status: "ACTIVE" as const,
          purpose: member.purpose,
          scope: member.scope,
          expiresAt: new Date(Date.now() + DURATION_MS[member.duration]),
          grantedById: admin.id,
        })),
      });
    }

    return newPatient;
  }).catch(err => {
    if (err.message === "INVALID_CARE_TEAM_MEMBER") return null;
    throw err;
  });

  if (!patient) {
    return NextResponse.json({ error: "invalid_care_team_member" }, { status: 400 });
  }

  await writeAuditLog({
    userId: admin.id,
    patientId: patient.id,
    action: "PATIENT_REGISTERED",
    outcome: "ALLOWED",
    reason: careTeam ? `Assigned ${careTeam.length} care team members` : "No care team assigned",
  });

  return NextResponse.json({ id: patient.id, patientCode: patient.patientCode }, { status: 201 });
}