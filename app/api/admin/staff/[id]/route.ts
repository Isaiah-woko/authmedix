import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/access-control";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { updateStaffSchema } from "@/lib/validators";
import { writeAuditLog } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireRole("ADMIN");
  if (!admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const parsed = updateStaffSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", details: parsed.error.flatten() }, { status: 400 });
  }

  const { status } = parsed.data;

  const targetUser = await prisma.user.findUnique({ where: { id } });
  if (!targetUser) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  // Admin can only manage staff in their own hospital
  if (targetUser.hospitalId !== admin.hospitalId) {
    return NextResponse.json({ error: "forbidden_cross_hospital" }, { status: 403 });
  }

  // Prevent admin from suspending themselves
  if (targetUser.id === admin.id && status === "SUSPENDED") {
     return NextResponse.json({ error: "cannot_suspend_self" }, { status: 400 });
  }

  const previousStatus = targetUser.status;
  const updateData: Prisma.UserUpdateInput = { status };

  // Unlocking a locked account resets the failed attempt counter
  if (status === "ACTIVE" && previousStatus === "LOCKED") {
    updateData.failedLoginAttempts = 0;
  }

  // Atomic transaction: update user status AND revoke passports if suspending
  const updatedUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id },
      data: updateData,
    });

    if (status === "SUSPENDED") {
      await tx.accessPassport.updateMany({
        where: { userId: id, status: "ACTIVE" },
        data: {
          status: "REVOKED",
          revokedById: admin.id,
          revokedAt: new Date(),
          revokeReason: "Account suspended",
        },
      });
    }

    return user;
  });

  await writeAuditLog({
    userId: admin.id,
    action: "STAFF_STATUS_UPDATED",
    outcome: "ALLOWED",
    reason: `Updated ${targetUser.healthId} status to ${status}`,
  });

  if (status === "SUSPENDED") {
    await writeAuditLog({
      userId: admin.id,
      action: "PASSPORTS_REVOKED_ON_SUSPENSION",
      outcome: "ALLOWED",
      reason: `Auto-revoked active passports for ${targetUser.healthId}`,
    });
  }

  return NextResponse.json({
    id: updatedUser.id,
    healthId: updatedUser.healthId,
    name: updatedUser.name,
    role: updatedUser.role,
    status: updatedUser.status,
    failedLoginAttempts: updatedUser.failedLoginAttempts,
  });
}