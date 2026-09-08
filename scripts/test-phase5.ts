import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { issueSessionToken, BCRYPT_ROUNDS } from "../lib/auth";
import { issueLoginCode } from "../lib/otp";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const COOKIE = "meditrust.session-token";
let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.error(`  FAIL  ${name}`); }
}

async function resetHospital(code: string) {
  const h = await prisma.hospital.findUnique({ where: { code } });
  if (!h) return;
  const users = await prisma.user.findMany({ where: { hospitalId: h.id }, select: { id: true } });
  const patients = await prisma.patient.findMany({ where: { hospitalId: h.id }, select: { id: true } });
  const uIds = users.map(u => u.id), pIds = patients.map(p => p.id);
  await prisma.auditLog.deleteMany({ where: { OR: [{ userId: { in: uIds } }, { patientId: { in: pIds } }] } });
  await prisma.loginCode.deleteMany({ where: { userId: { in: uIds } } });
  await prisma.record.deleteMany({ where: { OR: [{ authorId: { in: uIds } }, { patientId: { in: pIds } }] } });
  await prisma.passportRequest.deleteMany({ where: { OR: [{ requesterId: { in: uIds } }, { patientId: { in: pIds } }] } });
  await prisma.accessPassport.deleteMany({ where: { OR: [{ userId: { in: uIds } }, { patientId: { in: pIds } }] } });
  await prisma.patient.deleteMany({ where: { hospitalId: h.id } });
  await prisma.user.deleteMany({ where: { hospitalId: h.id } });
  await prisma.hospital.delete({ where: { id: h.id } });
}

async function main() {
  console.log(`Phase 5 HTTP tests against ${BASE} — ensure \`pnpm dev\` is running.\n`);
  
  await resetHospital("P5T");
  const hospital = await prisma.hospital.create({ data: { code: "P5T", name: "Phase 5 Test Hospital" } });
  
  const adminUser = await prisma.user.create({
    data: { healthId: "P5T-ADM-0001", email: "p5-admin@test.local", name: "P5 Admin", passwordHash: await bcrypt.hash("Admin!Pass1", BCRYPT_ROUNDS), role: "ADMIN", hospitalId: hospital.id, mustChangePassword: false, sessionTtlHrs: 4 }
  });
  const { token } = await issueSessionToken({ id: adminUser.id, healthId: adminUser.healthId, role: "ADMIN", hospitalId: adminUser.hospitalId, sessionTtlHrs: 4, mustChangePassword: false });
  const headers = { "Content-Type": "application/json", Cookie: `${COOKIE}=${token}` };

  console.log("--- GET /api/admin/staff ---");
  let res = await fetch(`${BASE}/api/admin/staff`, { headers });
  check("GET staff returns 200", res.status === 200);
  const staffList = await res.json();
  check("staff list is an array", Array.isArray(staffList));
  check("staff list contains our admin", staffList.some((u: any) => u.healthId === "P5T-ADM-0001"));
  check("passwordHash is NOT exposed", !staffList.some((u: any) => u.passwordHash));

  console.log("--- POST /api/admin/staff (with step-up) ---");
  let otp = await issueLoginCode(adminUser.id);
  res = await fetch(`${BASE}/api/admin/staff`, {
    method: "POST", headers,
    body: JSON.stringify({ name: "New Nurse", email: "p5-new-nurse@test.local", role: "NURSE", otpCode: otp }),
  });
  
  if (res.status !== 201) console.error("DEBUG POST STAFF FAILED:", res.status, await res.text());
  check("POST staff returns 201", res.status === 201);
  
  const newStaff = await res.json();
  check("returns healthId", !!newStaff.healthId);
  check("returns tempPassword", !!newStaff.tempPassword);
  check("healthId format is correct", String(newStaff.healthId).startsWith("P5T-NUR-"));
  
  const dbNewStaff = await prisma.user.findUnique({ where: { id: newStaff.id } });
  check("mustChangePassword is true in DB", dbNewStaff?.mustChangePassword === true);
  check("tempPassword verifies against DB hash", await bcrypt.compare(newStaff.tempPassword, dbNewStaff!.passwordHash));

  console.log("--- POST staff with bad step-up ---");
  res = await fetch(`${BASE}/api/admin/staff`, {
    method: "POST", headers,
    body: JSON.stringify({ name: "No Code", email: "nocode@test.local", role: "NURSE", otpCode: "000000" }),
  });
  check("bad step-up code returns 403", res.status === 403);

  console.log("--- POST duplicate email (fresh step-up) ---");
  otp = await issueLoginCode(adminUser.id);
  res = await fetch(`${BASE}/api/admin/staff`, {
    method: "POST", headers,
    body: JSON.stringify({ name: "Duplicate", email: "p5-new-nurse@test.local", role: "NURSE", otpCode: otp }),
  });
  check("duplicate email returns 409", res.status === 409);

  console.log("--- Suspend / unlock ---");
  const target = await prisma.user.create({
    data: { healthId: "P5T-DOC-9999", email: "p5-target@test.local", name: "Target Doctor", passwordHash: await bcrypt.hash("Target!Pass1", BCRYPT_ROUNDS), role: "DOCTOR", hospitalId: hospital.id, mustChangePassword: false, sessionTtlHrs: 8, status: "ACTIVE" }
  });
  const targetPatient = await prisma.patient.create({
    data: { patientCode: "P5T-PT-99999", name: "Target Patient", dob: new Date("1990-01-01"), hospitalId: hospital.id }
  });
  await prisma.accessPassport.create({
    data: { userId: target.id, patientId: targetPatient.id, type: "STANDARD", status: "ACTIVE", purpose: "Test", scope: [], expiresAt: new Date(Date.now() + 8 * 3_600_000) }
  });

  res = await fetch(`${BASE}/api/admin/staff/${target.id}`, { method: "PATCH", headers, body: JSON.stringify({ status: "SUSPENDED" }) });
  check("PATCH suspend returns 200", res.status === 200);
  const suspended = await res.json();
  check("status is SUSPENDED", suspended.status === "SUSPENDED");
  const activeCount = await prisma.accessPassport.count({ where: { userId: target.id, status: "ACTIVE" } });
  check("active passports revoked on suspend", activeCount === 0);

  await prisma.user.update({ where: { id: target.id }, data: { status: "LOCKED", failedLoginAttempts: 5 } });
  res = await fetch(`${BASE}/api/admin/staff/${target.id}`, { method: "PATCH", headers, body: JSON.stringify({ status: "ACTIVE" }) });
  check("PATCH unlock returns 200", res.status === 200);
  const unlocked = await res.json();
  check("status is ACTIVE", unlocked.status === "ACTIVE");
  check("failedLoginAttempts reset to 0", unlocked.failedLoginAttempts === 0);

  await resetHospital("P5T");
  await prisma.$disconnect();
  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}
main().catch((err) => { console.error(err); process.exit(1); });
