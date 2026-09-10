import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth, checkAccess } from "@/lib/access-control";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: recordId } = await params;

  const record = await prisma.record.findUnique({
    where: { id: recordId },
    select: {
      id: true,
      patientId: true,
      type: true,
      content: true,
      contentHash: true,
      createdAt: true,
      author: { select: { id: true, name: true, role: true } },
    }
  });

  if (!record) {
    return NextResponse.json({ error: "record_not_found" }, { status: 404 });
  }

  const access = await checkAccess({
    userId: user.id,
    patientId: record.patientId,
    action: "VIEW_RECORD",
    requiredScope: record.type,
  });

  if (!access.allowed) {
    return NextResponse.json({ reason: access.denyReason }, { status: 403 });
  }

  // Defense-in-depth: verify the specific record type isn't hidden for this role
  const visibility = access.visibility!;
  let isHidden = false;
  if (record.type === "NOTE" && visibility.notes === "hidden") isHidden = true;
  if (record.type === "LAB" && visibility.labs === "hidden") isHidden = true;
  if (record.type === "PRESCRIPTION" && visibility.prescriptions === "hidden") isHidden = true;
  if (record.type === "UPLOAD" && visibility.uploads === "hidden") isHidden = true;

  if (isHidden) {
    return NextResponse.json({ reason: "ROLE_DENIED" }, { status: 403 });
  }

  return NextResponse.json(record);
}