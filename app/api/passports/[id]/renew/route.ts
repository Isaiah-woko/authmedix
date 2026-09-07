import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/access-control";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  const passport = await prisma.accessPassport.findUnique({ where: { id } });
  if (!passport) {
    return NextResponse.json({ error: "passport_not_found" }, { status: 404 });
  }

  // Must be the holder
  if (passport.userId !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Cannot renew break-glass
  if (passport.type === "BREAK_GLASS") {
    return NextResponse.json({ error: "break_glass_not_renewable" }, { status: 403 });
  }

  // Must be active and not yet expired
  if (passport.status !== "ACTIVE" || passport.expiresAt <= new Date()) {
    return NextResponse.json({ error: "passport_not_renewable" }, { status: 400 });
  }

  // Calculate original duration to extend by the same amount
  const originalDurationMs = passport.expiresAt.getTime() - passport.createdAt.getTime();
  const newExpiresAt = new Date(passport.expiresAt.getTime() + originalDurationMs);

  const updated = await prisma.accessPassport.update({
    where: { id },
    data: {
      expiresAt: newExpiresAt,
      renewalCount: { increment: 1 },
    },
  });

  await writeAuditLog({
    userId: user.id,
    patientId: passport.patientId,
    action: "PASSPORT_RENEWED",
    outcome: "ALLOWED",
  });

  return NextResponse.json(updated);
}