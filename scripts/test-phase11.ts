import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { issueSessionToken, BCRYPT_ROUNDS } from "../lib/auth";
import { issueLoginCode } from "../lib/otp";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const COOKIE = "authmedix.session-token";
let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.error(`  FAIL  ${name}`); }
}

function getCookie(res: Response, name: string): string | undefined {
  const cookies = res.headers.getSetCookie?.() ?? [];
  let last: string | undefined;
  for (const c of cookies) {
    const [pair] = c.split(";");
    const [k, ...rest] = pair.split("=");
    if (k.trim() === name) last = rest.join("=");
  }
  return last;
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
  console.log(`Phase 11 tests against ${BASE} — ensure \`pnpm dev\` is running.\n`);

  await resetHospital("P11A");
  await resetHospital("P11B");
  const hospA = await prisma.hospital.create({ data: { code: "P11A", name: "Hosp A" } });
  const hospB = await prisma.hospital.create({ data: { code: "P11B", name: "Hosp B" } });

  const admin = await prisma.user.create({ data: { healthId: "P11A-ADM-0001", email: "p11a-admin@test.local", name: "Admin", passwordHash: await bcrypt.hash("Test!Pass1", BCRYPT_ROUNDS), role: "ADMIN", hospitalId: hospA.id, mustChangePassword: false, sessionTtlHrs: 8 } });
  const doctor = await prisma.user.create({ data: { healthId: "P11A-DOC-0001", email: "p11a-doc@test.local", name: "Doc", passwordHash: await bcrypt.hash("Test!Pass1", BCRYPT_ROUNDS), role: "DOCTOR", hospitalId: hospA.id, mustChangePassword: false, sessionTtlHrs: 8 } });

  const adminToken = (await issueSessionToken({ id: admin.id, healthId: admin.healthId, role: "ADMIN", hospitalId: admin.hospitalId, sessionTtlHrs: 8, mustChangePassword: false })).token;
  const doctorToken = (await issueSessionToken({ id: doctor.id, healthId: doctor.healthId, role: "DOCTOR", hospitalId: doctor.hospitalId, sessionTtlHrs: 8, mustChangePassword: false })).token;

  const adminHeaders = { "Content-Type": "application/json", Cookie: `${COOKIE}=${adminToken}` };
  const doctorHeaders = { "Content-Type": "application/json", Cookie: `${COOKIE}=${doctorToken}` };

  const patientB = await prisma.patient.create({ data: { patientCode: "P11B-PT-00001", name: "Hosp B Patient", dob: new Date(), hospitalId: hospB.id } });

  console.log("--- Item 1: cross-hospital grant blocked ---");
  let otp = await issueLoginCode(admin.id);
  let res = await fetch(`${BASE}/api/passports`, { method: "POST", headers: adminHeaders, body: JSON.stringify({ type: "STANDARD", healthId: "P11A-DOC-0001", patientId: patientB.id, purpose: "Sneaky", scope: [], otpCode: otp }) });
  if (res.status !== 403) console.error("DEBUG ITEM 1:", res.status, await res.text());
  check("grant for other hospital's patient → 403", res.status === 403);
  check("error is forbidden_cross_hospital", (await res.json()).error === "forbidden_cross_hospital");

  console.log("--- Item 2: step-up enforcement ---");
  res = await fetch(`${BASE}/api/admin/staff`, { method: "POST", headers: adminHeaders, body: JSON.stringify({ name: "No StepUp", email: "nostep@p11.test", role: "NURSE", otpCode: "000000" }) });
  check("wrong step-up code → 403", res.status === 403);
  otp = await issueLoginCode(admin.id);
  res = await fetch(`${BASE}/api/admin/staff`, { method: "POST", headers: adminHeaders, body: JSON.stringify({ name: "With StepUp", email: "withstep@p11.test", role: "NURSE", otpCode: otp }) });
  check("valid step-up code → 201", res.status === 201);

  console.log("--- Item 3: force-reset kills live sessions ---");
  res = await fetch(`${BASE}/api/patients?query=x`, { headers: doctorHeaders });
  check("doctor session works before force-reset", res.status === 200);

  res = await fetch(`${BASE}/api/admin/staff/${doctor.id}/force-reset`, { method: "POST", headers: adminHeaders });
  if (res.status !== 200) console.error("DEBUG FORCE RESET:", res.status, await res.text());
  check("force-reset returns 200", res.status === 200);

  res = await fetch(`${BASE}/api/patients?query=x`, { headers: doctorHeaders });
  check("stale doctor session now rejected (401)", res.status === 401);

  res = await fetch(`${BASE}/api/auth/set-password`, { method: "POST", headers: doctorHeaders, body: JSON.stringify({ newPassword: "Attacker!Tries1" }) });
  check("stale session cannot ride forced-change flow", res.status === 401);

  console.log("--- Item 3b: legitimate re-login + forced change ---");
  res = await fetch(`${BASE}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ healthId: "P11A-DOC-0001", email: "p11a-doc@test.local", password: "Test!Pass1" }) });
  check("fresh login step 1 succeeds", res.status === 200);

  const freshCode = await issueLoginCode(doctor.id);
  res = await fetch(`${BASE}/api/auth/verify-code`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ healthId: "P11A-DOC-0001", code: freshCode }) });
  check("fresh login step 2 succeeds", res.status === 200);
  const newCookie = getCookie(res, COOKIE);
  check("session cookie issued", !!newCookie);

  const freshHeaders = { "Content-Type": "application/json", Cookie: `${COOKIE}=${newCookie}` };
  res = await fetch(`${BASE}/api/patients?query=x`, { headers: freshHeaders });
  check("forced-change session blocked from data routes", res.status === 401 || res.status === 403);

  res = await fetch(`${BASE}/api/auth/set-password`, { method: "POST", headers: freshHeaders, body: JSON.stringify({ newPassword: "Rotated!Pass2x" }) });
  check("forced change succeeds on fresh session", res.status === 200);

  const rotatedCookie = getCookie(res, COOKIE);
  res = await fetch(`${BASE}/api/patients?query=x`, { headers: { "Content-Type": "application/json", Cookie: `${COOKIE}=${rotatedCookie}` } });
  check("post-rotation session works", res.status === 200);

  await resetHospital("P11A");
  await resetHospital("P11B");
  await prisma.$disconnect();
  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}
main().catch((err) => { console.error(err); process.exit(1); });
