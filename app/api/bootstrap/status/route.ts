import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });

  return NextResponse.json(
    { needsSetup: adminCount === 0 },
    { headers: { "Cache-Control": "no-store" } },
  );
}