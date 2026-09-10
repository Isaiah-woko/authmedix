import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/access-control";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const passports = await prisma.accessPassport.findMany({
    where: { userId: user.id, status: "ACTIVE", expiresAt: { gt: new Date() } },
    include: { patient: { select: { id: true, name: true, patientCode: true, hospitalId: true } } },
    orderBy: { expiresAt: "asc" },
  });

  return NextResponse.json(passports);
}