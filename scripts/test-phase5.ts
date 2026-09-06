import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { issueSessionToken, BCRYPT_ROUNDS } from "../lib/auth";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const COOKIE = "meditrust.session-token";

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.error(`  FAIL  ${name}`); }
}

async function getAdminHeaders() {
  const hospital = await prisma.hospital.upsert({
    where: { code: "P5T" },
    update: {},
    create: { code: "P5T", name: "Phase 5 Test Hospital" },
  });

  const adminUser = await prisma.user.upsert({
    where: { healthId: "P5T-ADM-0001" },
    update: { status: "ACTIVE", mustChangePassword: false },
    create: {
      healthId: "P5T-ADM-0001",
      email: "p5-admin@test.local",
      name: "P5 Admin",
      passwordHash: await bcrypt.hash("Admin!Pass1", BCRYPT_ROUNDS),
      role: "ADMIN",
      hospitalId: hospital.id,
      mustChangePassword: false,
      sessionTtlHrs: 4,
    },
  });

  const { token } = await issueSessionToken({
    id: adminUser.id,
    healthId: adminUser.healthId,
    role: "ADMIN",
    hospitalId: adminUser.hospitalId,
    sessionTtlHrs: 4,
    mustChangePassword: false,
  });

  return { "Content-Type": "application/json", Cookie: `${COOKIE}=${token}` };
}

async function main() {
  console.log(`Phase 5 HTTP tests against ${BASE} — make sure \`pnpm dev\` is running.\n`);

  const headers = await getAdminHeaders();
  const targetHospital = await prisma.hospital.findUnique({ where: { code: "P5T" } });

  const targetUser = await prisma.user.create({
    data: {
      healthId: "P5T-DOC-9999",
      email: "p5-target@test.local",
      name: "Target Doctor",
      passwordHash: await bcrypt.hash("Target!Pass1", BCRYPT_ROUNDS),
      role: "DOCTOR",
      hospitalId: targetHospital!.id,
      mustChangePassword: false,
      sessionTtlHrs: 8,
      status: "ACTIVE",
    }
  });

  const targetPatient = await prisma.patient.create({
    data: {
      patientCode: "P5T-PT-99999",
      name: "Target Patient",
      dob: new Date("1990-01-01"),
      hospitalId: targetHospital!.id,
    }
  });

  await prisma.accessPassport.create({
    data: {
      userId: targetUser.id,
      patientId: targetPatient.id,
      type: "STANDARD",
      status: "ACTIVE",
      purpose: "Test",
      scope: [],
      expiresAt: new Date(Date.now() + 8 * 3_600_000),
    }
  });

  console.log("--- GET /api/admin/staff ---");
  let res = await fetch(`${BASE}/api/admin/staff`, { headers });
  check("GET staff returns 200", res.status === 200);
  const staffList = await res.json();
  check("staff list is an array", Array.isArray(staffList));
  check("staff list contains our admin", staffList.some((u: any) => u.healthId === "P5T-ADM-0001"));
  check("passwordHash is NOT exposed", !staffList.some((u: any) => u.passwordHash));

  console.log("--- POST /api/admin/staff ---");
  res = await fetch(`${BASE}/api/admin/staff`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name: "New Nurse", email: "p5-new-nurse@test.local", role: "NURSE" }),
  });
  check("POST staff returns 201", res.status === 201);
  const newStaff = await res.json();
  check("returns healthId", !!newStaff.healthId);
  check("returns tempPassword", !!newStaff.tempPassword);
  check("healthId format is correct", newStaff.healthId.startsWith("P5T-NUR-"));

  const dbNewStaff = await prisma.user.findUnique({ where: { id: newStaff.id } });
  check("mustChangePassword is true in DB", dbNewStaff?.mustChangePassword === true);
  check("tempPassword verifies against DB hash", await bcrypt.compare(newStaff.tempPassword, dbNewStaff!.passwordHash));

  console.log("--- POST duplicate email ---");
  res = await fetch(`${BASE}/api/admin/staff`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name: "Duplicate Nurse", email: "p5-new-nurse@test.local", role: "NURSE" }),
  });
  check("duplicate email returns 409", res.status === 409);

  console.log("--- PATCH suspend (auto-revokes passports) ---");
  res = await fetch(`${BASE}/api/admin/staff/${targetUser.id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ status: "SUSPENDED" }),
  });
  check("PATCH suspend returns 200", res.status === 200);
  const suspendedUser = await res.json();
  check("status is SUSPENDED", suspendedUser.status === "SUSPENDED");

  const activePassports = await prisma.accessPassport.count({ where: { userId: targetUser.id, status: "ACTIVE" } });
  check("active passports revoked on suspend", activePassports === 0);

  const revokedPassports = await prisma.accessPassport.findMany({ where: { userId: targetUser.id, status: "REVOKED" } });
  check("revoked passports have reason 'Account suspended'", revokedPassports.every(p => p.revokeReason === "Account suspended"));

  console.log("--- PATCH unlock (resets failed attempts) ---");
  await prisma.user.update({
    where: { id: targetUser.id },
    data: { status: "LOCKED", failedLoginAttempts: 5 }
  });

  res = await fetch(`${BASE}/api/admin/staff/${targetUser.id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ status: "ACTIVE" }),
  });
  check("PATCH unlock returns 200", res.status === 200);
  const unlockedUser = await res.json();
  check("status is ACTIVE", unlockedUser.status === "ACTIVE");
  check("failedLoginAttempts reset to 0", unlockedUser.failedLoginAttempts === 0);

  // Cleanup
  await prisma.accessPassport.deleteMany({ where: { userId: targetUser.id } });
  await prisma.patient.delete({ where: { id: targetPatient.id } });
  await prisma.user.deleteMany({ where: { hospitalId: targetHospital!.id } });
  await prisma.hospital.delete({ where: { id: targetHospital!.id } });
  await prisma.$disconnect();

  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });