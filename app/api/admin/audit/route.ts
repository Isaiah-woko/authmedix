import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/access-control";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const admin = await requireRole("ADMIN");
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const flaggedFilter = req.nextUrl.searchParams.get("flagged");
  const reviewedFilter = req.nextUrl.searchParams.get("reviewed");

  const whereClause: Prisma.AccessPassportWhereInput = {};

  if (flaggedFilter === "true") whereClause.flagged = true;
  if (reviewedFilter === "false") whereClause.reviewed = false;
  if (reviewedFilter === "true") whereClause.reviewed = true;

  // Admin can only see events for patients in their hospital
  whereClause.patient = { hospitalId: admin.hospitalId };

  const events = await prisma.accessPassport.findMany({
    where: whereClause,
    include: {
      user: { select: { id: true, name: true, role: true, healthId: true, hospitalId: true } },
      patient: { select: { id: true, name: true, patientCode: true } },
      reviewedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Compute high-priority signals (repeated break-glass by the same worker)
  const userIdCounts = await prisma.accessPassport.groupBy({
    by: ["userId"],
    where: { type: "BREAK_GLASS" },
    _count: { id: true },
  });

  const countMap = new Map(userIdCounts.map(c => [c.userId, c._count.id]));

  const enrichedEvents = events.map(event => ({
    ...event,
    highPriority: (countMap.get(event.userId) ?? 0) > 1,
  }));

  return NextResponse.json(enrichedEvents);
}