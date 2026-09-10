import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { BCRYPT_ROUNDS } from "@/lib/auth";

// Strict validation for the initial setup
const bootstrapSchema = z.object({
  hospitalName: z.string().min(2, "Hospital name is required"),
  hospitalCode: z.string().min(2).max(10, "Code must be 2-10 characters"),
  adminName: z.string().min(2, "Admin name is required"),
  adminEmail: z.string().email("Valid email is required"),
  adminPassword: z
    .string()
    .min(10, "Password must be at least 10 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[a-z]/, "Must contain a lowercase letter")
    .regex(/[0-9]/, "Must contain a number")
    .regex(/[^A-Za-z0-9]/, "Must contain a symbol"),
});

export async function POST(req: NextRequest) {
  // 🛑 THE KILL SWITCH: If even ONE admin exists in the entire system, this route is dead.
  const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
  if (adminCount > 0) {
    return NextResponse.json(
      { error: "bootstrap_already_completed", message: "System is already initialized." },
      { status: 403 }
    );
  }

  const parsed = bootstrapSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { hospitalName, hospitalCode, adminName, adminEmail, adminPassword } = parsed.data;

  // Create Hospital and Admin atomically
  const result = await prisma.$transaction(async (tx) => {
    // Check if hospital code is already taken (edge case if DB wasn't fully wiped)
    const existingHospital = await tx.hospital.findUnique({ where: { code: hospitalCode.toUpperCase() } });
    if (existingHospital) {
      throw new Error("HOSPITAL_CODE_EXISTS");
    }

    const hospital = await tx.hospital.create({
      data: {
        name: hospitalName,
        code: hospitalCode.toUpperCase()
      },
    });

    const healthId = `${hospital.code}-ADM-0001`;

    // Check if email is already taken
    const existingEmail = await tx.user.findUnique({ where: { email: adminEmail } });
    if (existingEmail) {
      throw new Error("EMAIL_EXISTS");
    }

    const passwordHash = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS);

    const admin = await tx.user.create({
      data: {
        healthId,
        name: adminName,
        email: adminEmail,
        passwordHash,
        role: "ADMIN",
        hospitalId: hospital.id,
        mustChangePassword: false, // They just set their own strong password
        sessionTtlHrs: 4,
        status: "ACTIVE",
      },
    });

    return { hospital, admin };
  }).catch((err) => {
    if (err.message === "HOSPITAL_CODE_EXISTS") return { error: "hospital_code_exists" };
    if (err.message === "EMAIL_EXISTS") return { error: "email_exists" };
    throw err;
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  // System-level audit log (userId is null because no one was logged in yet)
  await writeAuditLog({
    action: "SYSTEM_BOOTSTRAP",
    outcome: "ALLOWED",
    reason: `Initial Admin ${result.admin.healthId} created for ${result.hospital.name}`,
  });

  return NextResponse.json({
    message: "Bootstrap successful. You may now log in.",
    healthId: result.admin.healthId
  }, { status: 201 });
}