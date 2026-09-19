import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireRole, DURATION_MS } from "@/lib/access-control";
import { prisma } from "@/lib/prisma";
import { approveRequestSchema } from "@/lib/validators";
import { writeAuditLog } from "@/lib/audit";
import { sensitiveActionLimiter, getClientIp } from "@/lib/rate-limit";
import { verifyStepUpCode } from "@/lib/otp";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireRole("ADMIN");
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const parsed = approveRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", details: parsed.error.flatten() }, { status: 400 });
  }

  const { duration, scope, otpCode } = parsed.data;

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

  const stepUpOk = await verifyStepUpCode(admin.id, otpCode);
  if (!stepUpOk) {
    await writeAuditLog({
      userId: admin.id,
      action: "APPROVE_STEP_UP_FAILED",
      outcome: "DENIED",
      reason: "INVALID_OTP"
    });
    return NextResponse.json({ error: "step_up_verification_failed" }, { status: 403 });
  }

  const request = await prisma.passportRequest.findUnique({
    where: { id },
    include: { patient: true },
  });

  if (!request || request.status !== "PENDING") {
    return NextResponse.json({ error: "request_not_found_or_already_reviewed" }, { status: 404 });
  }

  // Admin can only approve requests for patients in their own hospital
  if (request.patient.hospitalId !== admin.hospitalId) {
    return NextResponse.json({ error: "forbidden_cross_hospital" }, { status: 403 });
  }

  const finalScope = scope && scope.length > 0 ? scope : request.scope;
  const expiresAt = new Date(Date.now() + DURATION_MS[duration]);

  // Atomic transaction: create passport + update request
  const result = await prisma.$transaction(async (tx) => {
    const passport = await tx.accessPassport.create({
      data: {
        type: "STANDARD",
        status: "ACTIVE",
        userId: request.requesterId,
        patientId: request.patientId,
        purpose: request.purpose,
        scope: finalScope,
        expiresAt,
        grantedById: admin.id,
      },
    });

    const updatedRequest = await tx.passportRequest.update({
      where: { id },
      data: {
        status: "APPROVED",
        reviewedById: admin.id,
        reviewedAt: new Date(),
        resultingPassportId: passport.id,
      },
    });

    return { passport, updatedRequest };
  });

  await writeAuditLog({
    userId: admin.id,
    patientId: request.patientId,
    action: "PASSPORT_REQUEST_APPROVED",
    outcome: "ALLOWED",
    reason: `Approved ${duration} passport for ${request.requesterId}`,
  });

  return NextResponse.json(result);
}