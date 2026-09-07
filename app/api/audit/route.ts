import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/access-control";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

const auditQuerySchema = z.object({
  userId: z.string().optional(),
  patientId: z.string().optional(),
  action: z.string().optional(),
  outcome: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  limit: z.coerce.number().int().positive().max(1000).default(100),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export async function GET(req: NextRequest) {
  const admin = await requireRole("ADMIN");
  if (!admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const parsed = auditQuerySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams.entries())
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_query", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { userId, patientId, action, outcome, startDate, endDate, limit, offset } = parsed.data;

  const whereClause: Prisma.AuditLogWhereInput = {};

  if (userId) whereClause.userId = userId;
  if (patientId) whereClause.patientId = patientId;
  if (action) whereClause.action = action;
  if (outcome) whereClause.outcome = outcome;

  if (startDate || endDate) {
    whereClause.createdAt = {};
    if (startDate) whereClause.createdAt.gte = startDate;
    if (endDate) whereClause.createdAt.lte = endDate;
  }

  // Scope audit logs to the Admin's hospital.
  // An admin sees events where the acting user is in their hospital,
  // OR the target patient is in their hospital,
  // OR it's a system-level event (e.g., failed login with unknown user).
  whereClause.OR = [
    { user: { hospitalId: admin.hospitalId } },
    { patient: { hospitalId: admin.hospitalId } },
    { userId: null, patientId: null },
  ];

  const [logs, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, role: true, healthId: true } },
        patient: { select: { id: true, name: true, patientCode: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.auditLog.count({ where: whereClause }),
  ]);

  return NextResponse.json({ logs, total, limit, offset });
}