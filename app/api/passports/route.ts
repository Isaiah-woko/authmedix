import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireRole, DURATION_MS } from "@/lib/access-control";
import { prisma } from "@/lib/prisma";
import { grantPassportSchema } from "@/lib/validators";
import { writeAuditLog } from "@/lib/audit";
import { sensitiveActionLimiter, getClientIp } from "@/lib/rate-limit";
import { verifyStepUpCode } from "@/lib/otp";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const admin = await requireRole("ADMIN");
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const activeOnly = req.nextUrl.searchParams.get("active") === "true";
  const patientId = req.nextUrl.searchParams.get("patientId");

  // Replaced `any` with Prisma's strict type for AccessPassport queries
  const whereClause: Prisma.AccessPassportWhereInput = {};

  if (activeOnly) whereClause.status = "ACTIVE";
  if (patientId) whereClause.patientId = patientId;

  // Admin can only see passports for patients in their hospital
  whereClause.patient = { hospitalId: admin.hospitalId };

  const passports = await prisma.accessPassport.findMany({
    where: whereClause,
    include: {
      user: { select: { id: true, name: true, role: true, healthId: true } },
      patient: { select: { id: true, name: true, patientCode: true } },
    },
    orderBy: { expiresAt: "asc" },
  });

  return NextResponse.json(passports);
}

export async function POST(req: NextRequest) {
  const admin = await requireRole("ADMIN");
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = grantPassportSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", details: parsed.error.flatten() }, { status: 400 });
  }

  const { type, healthId, patientId, purpose, scope, duration } = parsed.data;

  // --- NEW UPSTASH RATE LIMITING ---
  const ip = getClientIp(req.headers);
  const identifier = `${ip}:${admin.id}`;

  const { success, limit, reset, remaining } = await sensitiveActionLimiter.limit(identifier);
  if (!success) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: "Too many sensitive actions. Please try again later.",
        retryAfter: Math.ceil((reset - Date.now()) / 1000)
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
        },
      }
    );
  }
  // --- END RATE LIMITING ---

  const stepUpOk = await verifyStepUpCode(admin.id, parsed.data.otpCode);
  if (!stepUpOk) {
    await writeAuditLog({ userId: admin.id, action: "PASSPORT_GRANT_STEP_UP_FAILED", outcome: "DENIED" });
    return NextResponse.json({ error: "step_up_verification_failed" }, { status: 403 });
  }

  // Validate target user exists and is active
  const targetUser = await prisma.user.findUnique({ where: { healthId } });
  if (!targetUser || targetUser.status !== "ACTIVE") {
    return NextResponse.json({ error: "target_user_not_found_or_inactive" }, { status: 404 });
  }

  // Validate patient exists
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) {
    return NextResponse.json({ error: "patient_not_found" }, { status: 404 });
  }

  // An admin may only grant passports for their OWN hospital's patients.
  if (patient.hospitalId !== admin.hospitalId) {
    return NextResponse.json({ error: "forbidden_cross_hospital" }, { status: 403 });
  }

  // Referrals are strictly 48 hours and ignore client-supplied duration
  const finalDuration = type === "REFERRAL" ? "REFERRAL" : (duration || "8H");
  const expiresAt = new Date(Date.now() + DURATION_MS[finalDuration]);

  const passport = await prisma.accessPassport.create({
    data: {
      type,
      status: "ACTIVE",
      userId: targetUser.id,
      patientId,
      purpose,
      scope,
      expiresAt,
      grantedById: admin.id,
    },
  });

  await writeAuditLog({
    userId: admin.id,
    patientId,
    action: "PASSPORT_GRANTED",
    outcome: "ALLOWED",
    reason: `Granted ${type} passport to ${healthId}`,
  });

  return NextResponse.json(passport, { status: 201 });
}