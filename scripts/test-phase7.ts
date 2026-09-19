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
  console.log(`Phase 7 HTTP tests against ${BASE} — ensure \`pnpm dev\` is running.\n`);
  
  await resetHospital("P7A");
  await resetHospital("P7B");
  const hospitalA = await prisma.hospital.create({ data: { code: "P7A", name: "Hospital A" } });
  const hospitalB = await prisma.hospital.create({ data: { code: "P7B", name: "Hospital B" } });

  const adminUser = await prisma.user.create({ data: { healthId: "P7A-ADM-0001", email: "p7a-admin@test.local", name: "Admin", passwordHash: await bcrypt.hash("Test!Pass1", BCRYPT_ROUNDS), role: "ADMIN", hospitalId: hospitalA.id, mustChangePassword: false, sessionTtlHrs: 8 } });
  const doctorUser = await prisma.user.create({ data: { healthId: "P7A-DOC-0001", email: "p7a-doc@test.local", name: "Doc", passwordHash: await bcrypt.hash("Test!Pass1", BCRYPT_ROUNDS), role: "DOCTOR", hospitalId: hospitalA.id, mustChangePassword: false, sessionTtlHrs: 8 } });
  await prisma.user.create({ data: { healthId: "P7B-DOC-0001", email: "p7b-doc@test.local", name: "Ext Doc", passwordHash: await bcrypt.hash("Test!Pass1", BCRYPT_ROUNDS), role: "DOCTOR", hospitalId: hospitalB.id, mustChangePassword: false, sessionTtlHrs: 8 } });

  const adminToken = (await issueSessionToken({ id: adminUser.id, healthId: adminUser.healthId, role: "ADMIN", hospitalId: adminUser.hospitalId, sessionTtlHrs: 8, mustChangePassword: false })).token;
  const doctorToken = (await issueSessionToken({ id: doctorUser.id, healthId: doctorUser.healthId, role: "DOCTOR", hospitalId: doctorUser.hospitalId, sessionTtlHrs: 8, mustChangePassword: false })).token;
  
  const adminHeaders = { "Content-Type": "application/json", Cookie: `${COOKIE}=${adminToken}` };
  const doctorHeaders = { "Content-Type": "application/json", Cookie: `${COOKIE}=${doctorToken}` };

  const patient = await prisma.patient.create({ data: { patientCode: "P7A-PT-00001", name: "P7 Patient", dob: new Date(), hospitalId: hospitalA.id } });

  console.log("--- POST /api/passport-requests ---");
  let res = await fetch(`${BASE}/api/passport-requests`, { method: "POST", headers: doctorHeaders, body: JSON.stringify({ patientId: patient.id }) });
  const reqBody = await res.json();
  check("request status is PENDING", reqBody.status === "PENDING");

  console.log("--- POST approve (with step-up OTP) ---");
  let otp = await issueLoginCode(adminUser.id);
  res = await fetch(`${BASE}/api/passport-requests/${reqBody.id}/approve`, { method: "POST", headers: adminHeaders, body: JSON.stringify({ duration: "8H", otpCode: otp }) });
  if (res.status !== 200) console.error("DEBUG APPROVE FAILED:", res.status, await res.text());
  check("Approve returns 200", res.status === 200);
  const approved = await res.json();
  check("Passport created", !!approved.passport?.id);
  check("Request status updated to APPROVED", approved.updatedRequest?.status === "APPROVED");

  const dbPassport = await prisma.accessPassport.findUnique({ where: { id: approved.passport.id } });
  check("Passport type is STANDARD", dbPassport?.type === "STANDARD");
  check("Passport expires in ~8 hours", dbPassport!.expiresAt.getTime() > Date.now() + 7 * 3_600_000);

  console.log("--- POST renew ---");
  res = await fetch(`${BASE}/api/passports/${dbPassport!.id}/renew`, { method: "POST", headers: doctorHeaders });
  check("Renew returns 200", res.status === 200);
  const renewed = await res.json();
  check("Renewal count incremented", renewed.renewalCount === 1);
  check("ExpiresAt extended", new Date(renewed.expiresAt).getTime() > dbPassport!.expiresAt.getTime());

  console.log("--- POST revoke ---");
  res = await fetch(`${BASE}/api/passports/${dbPassport!.id}/revoke`, { method: "POST", headers: adminHeaders, body: JSON.stringify({ revokeReason: "Clinical purpose ended" }) });
  check("Revoke returns 200", res.status === 200);
  const revoked = await prisma.accessPassport.findUnique({ where: { id: dbPassport!.id } });
  check("Passport status is REVOKED", revoked?.status === "REVOKED");
  check("Revoke reason saved", revoked?.revokeReason === "Clinical purpose ended");

  console.log("--- POST grant REFERRAL (cross-hospital, with step-up OTP) ---");
  otp = await issueLoginCode(adminUser.id);
  res = await fetch(`${BASE}/api/passports`, { method: "POST", headers: adminHeaders, body: JSON.stringify({ type: "REFERRAL", healthId: "P7B-DOC-0001", patientId: patient.id, purpose: "Consult", scope: ["NOTE"], otpCode: otp }) });
  if (res.status !== 201) console.error("DEBUG REFERRAL FAILED:", res.status, await res.text());
  check("Grant referral returns 201", res.status === 201);
  const referral = await res.json();
  const dbReferral = await prisma.accessPassport.findUnique({ where: { id: referral.id } });
  check("Referral type is REFERRAL", dbReferral?.type === "REFERRAL");
  check("Referral duration forced to 48h", dbReferral!.expiresAt.getTime() > Date.now() + 47 * 3_600_000);

  console.log("--- POST deny ---");
  res = await fetch(`${BASE}/api/passport-requests`, { method: "POST", headers: doctorHeaders, body: JSON.stringify({ patientId: patient.id, purpose: "Urgent" }) });
  const req2 = await res.json();
  res = await fetch(`${BASE}/api/passport-requests/${req2.id}/deny`, { method: "POST", headers: adminHeaders, body: JSON.stringify({ denialReason: "Not justified" }) });
  check("Deny returns 200", res.status === 200);
  const denied = await prisma.passportRequest.findUnique({ where: { id: req2.id } });
  check("Request status is DENIED", denied?.status === "DENIED");

  await resetHospital("P7A");
  await resetHospital("P7B");
  await prisma.$disconnect();
  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}
main().catch((err) => { console.error(err); process.exit(1); });
