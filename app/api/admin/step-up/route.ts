import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/access-control";
import { issueLoginCode } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/email";
import { sensitiveActionLimiter, getClientIp } from "@/lib/rate-limit";
import { writeAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const admin = await requireRole("ADMIN");
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // --- NEW UPSTASH RATE LIMITING ---
  const ip = getClientIp(req.headers);
  const identifier = `${ip}:${admin.id}`;

  const { success, limit, reset, remaining } = await sensitiveActionLimiter.limit(identifier);
  if (!success) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: "Too many step-up attempts. Please try again later.",
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

  const code = await issueLoginCode(admin.id);
  await sendOtpEmail(admin.email, code);
  await writeAuditLog({ userId: admin.id, action: "STEP_UP_CODE_ISSUED", outcome: "ALLOWED" });

  return NextResponse.json({ codeSent: true });
}