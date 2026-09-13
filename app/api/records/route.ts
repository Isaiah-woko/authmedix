import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth, checkAccess } from "@/lib/access-control";
import { prisma } from "@/lib/prisma";
import { createRecordSchema } from "@/lib/validators";
import { canAuthorType } from "@/lib/role-fields";
import { writeAuditLog } from "@/lib/audit";
import { sha256 } from "@/lib/hash";

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = createRecordSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", details: parsed.error.flatten() }, { status: 400 });
  }

  const { patientId, type, content } = parsed.data;

  // 1. Check authoring permissions (role-based)
  if (!canAuthorType(user.role, type)) {
    await writeAuditLog({
      userId: user.id,
      patientId,
      action: "CREATE_RECORD",
      outcome: "DENIED",
      reason: `ROLE_AUTHORING_DENIED: ${type}`,
    });
    return NextResponse.json({ error: "forbidden_authoring" }, { status: 403 });
  }

  // 2. Check access to the patient
  const access = await checkAccess({
    userId: user.id,
    patientId,
    action: "CREATE_RECORD",
    requiredScope: type,
  });

  if (!access.allowed) {
    if (access.patientMissing) {
      return NextResponse.json({ error: "patient_not_found" }, { status: 404 });
    }
    // Otherwise, return the standard 403 with the deny reason
    return NextResponse.json({ reason: access.denyReason }, { status: 403 });
  }

  // 3. Create the record
  const record = await prisma.record.create({
    data: {
      patientId,
      authorId: user.id,
      type,
      content,
      contentHash: sha256(content), // Tamper-evident hash for the record content
    },
  });

  await writeAuditLog({
    userId: user.id,
    patientId,
    action: "CREATE_RECORD",
    outcome: "ALLOWED",
    reason: `Created ${type}`,
  });

  return NextResponse.json({ id: record.id, type: record.type, createdAt: record.createdAt }, { status: 201 });
}