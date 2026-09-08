import { NextResponse } from "next/server";
import { requireRole } from "@/lib/access-control";
import { issueLoginCode } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { writeAuditLog } from "@/lib/audit";

export async function POST() {
  const admin = await requireRole("ADMIN");
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  if (!rateLimit(`stepup:${admin.id}`, 5, 15 * 60_000).allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const code = await issueLoginCode(admin.id);
  await sendOtpEmail(admin.email, code);
  await writeAuditLog({ userId: admin.id, action: "STEP_UP_CODE_ISSUED", outcome: "ALLOWED" });

  return NextResponse.json({ codeSent: true });
}