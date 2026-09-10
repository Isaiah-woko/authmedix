import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { requireRole } from "@/lib/access-control";
import { prisma } from "@/lib/prisma";
import { createStaffSchema } from "@/lib/validators";
import { generateHealthId, generateTempPassword } from "@/lib/id-generators";
import { writeAuditLog } from "@/lib/audit";
import { BCRYPT_ROUNDS } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { verifyStepUpCode } from "@/lib/otp";

export async function GET() {
  const admin = await requireRole("ADMIN");
  if (!admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Strictly scoped to the admin's hospital. passwordHash is explicitly excluded.
  const staff = await prisma.user.findMany({
    where: { hospitalId: admin.hospitalId },
    select: {
      id: true,
      healthId: true,
      name: true,
      email: true,
      role: true,
      status: true,
      mustChangePassword: true,
      failedLoginAttempts: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(staff);
}

export async function POST(req: NextRequest) {
  const admin = await requireRole("ADMIN");
  if (!admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const parsed = createStaffSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", details: parsed.error.flatten() }, { status: 400 });
  }

  const { name, email, role } = parsed.data;
    if (!rateLimit(`stepup-verify:${admin.id}`, 10, 15 * 60_000).allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const stepUpOk = await verifyStepUpCode(admin.id, parsed.data.otpCode);
  if (!stepUpOk) {
    await writeAuditLog({ userId: admin.id, action: "STAFF_CREATE_STEP_UP_FAILED", outcome: "DENIED" });
    return NextResponse.json({ error: "step_up_verification_failed" }, { status: 403 });
  }

  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    return NextResponse.json({ error: "email_already_exists" }, { status: 409 });
  }

  const hospital = await prisma.hospital.findUnique({ where: { id: admin.hospitalId } });
  if (!hospital) {
    return NextResponse.json({ error: "hospital_not_found" }, { status: 500 });
  }

  // Generate Health ID with collision handling
  let sequence = (await prisma.user.count({ where: { hospitalId: admin.hospitalId, role } })) + 1;
  let finalHealthId = generateHealthId(hospital.code, role, sequence);

  while (await prisma.user.findUnique({ where: { healthId: finalHealthId } })) {
    sequence++;
    finalHealthId = generateHealthId(hospital.code, role, sequence);
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);

  const newUser = await prisma.user.create({
    data: {
      healthId: finalHealthId,
      name,
      email,
      passwordHash,
      role,
      hospitalId: admin.hospitalId,
      mustChangePassword: true,
      status: "ACTIVE",
      // Role-based session TTL defaults
      sessionTtlHrs: role === "ADMIN" ? 4 : role === "NURSE" ? 6 : 8,
    },
  });

  await writeAuditLog({
    userId: admin.id,
    action: "STAFF_CREATED",
    outcome: "ALLOWED",
    reason: `Created ${role} ${finalHealthId}`,
  });

  // Return plaintext temp password exactly once
  return NextResponse.json({
    id: newUser.id,
    healthId: newUser.healthId,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
    tempPassword,
  }, { status: 201 });
}