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

async function getHeaders(role: "ADMIN" | "DOCTOR", hospitalId: string, healthId: string) {
  const user = await prisma.user.upsert({
    where: { healthId },
    update: { status: "ACTIVE", mustChangePassword: false },
    create: {
      healthId,
      email: `${healthId.toLowerCase()}@phase7.test`,
      name: `P7 ${role}`,
      passwordHash: await bcrypt.hash("Test!Pass1", BCRYPT_ROUNDS),
      role,
      hospitalId,
      mustChangePassword: false,
      sessionTtlHrs: 8,
    },
  });

  const { token } = await issueSessionToken({
    id: user.id, healthId: user.healthId, role,
    hospitalId: user.hospitalId, sessionTtlHrs: 8, mustChangePassword: false,
  });

  return { "Content-Type": "application/json", Cookie: `${COOKIE}=${token}` };
}

async function main() {
  console.log(`Phase 7 HTTP tests against ${BASE} — make sure \`pnpm dev\` is running.\n`);

  const hospitalA = await prisma.hospital.upsert({ where: { code: "P7A" }, update: {}, create: { code: "P7A", name: "Hospital A" } });
  const hospitalB = await prisma.hospital.upsert({ where: { code: "P7B" }, update: {}, create: { code: "P7B", name: "Hospital B" } });

  const adminHeaders = await getHeaders("ADMIN", hospitalA.id, "P7A-ADM-0001");
  const doctorHeaders = await getHeaders("DOCTOR", hospitalA.id, "P7A-DOC-0001");
  const extDoctorHeaders = await getHeaders("DOCTOR", hospitalB.id, "P7B-DOC-0001");

  const patient = await prisma.patient.create({
    data: { patientCode: "P7A-PT-00001", name: "P7 Patient", dob: new Date(), hospitalId: hospitalA.id }
  });

  console.log("--- POST /api/passport-requests ---");
  let res = await fetch(`${BASE}/api/passport-requests`, {
    method: "POST", headers: doctorHeaders,
    body: JSON.stringify({ patientId: patient.id }),
  });
  check("POST request returns 201", res.status === 201);
  const reqBody = await res.json();
  check("request status is PENDING", reqBody.status === "PENDING");
  check("purpose pre-filled from role", !!reqBody.purpose);
  check("scope pre-filled from role", Array.isArray(reqBody.scope) && reqBody.scope.length > 0);

  console.log("--- GET /api/passport-requests (Admin) ---");
  res = await fetch(`${BASE}/api/passport-requests?status=PENDING`, { headers: adminHeaders });
  const pendingList = await res.json();
  check("Admin sees pending request", pendingList.length === 1);

  console.log("--- POST approve ---");
  res = await fetch(`${BASE}/api/passport-requests/${reqBody.id}/approve`, {
    method: "POST", headers: adminHeaders,
    body: JSON.stringify({ duration: "8H" }),
  });
  check("Approve returns 200", res.status === 200);
  const approved = await res.json();
  check("Passport created", !!approved.passport?.id);
  check("Request status updated to APPROVED", approved.updatedRequest.status === "APPROVED");

  const dbPassport = await prisma.accessPassport.findUnique({ where: { id: approved.passport.id } });
  check("Passport type is STANDARD", dbPassport?.type === "STANDARD");
  check("Passport expires in ~8 hours", dbPassport!.expiresAt.getTime() > Date.now() + 7 * 3600_000);

  console.log("--- POST renew ---");
  res = await fetch(`${BASE}/api/passports/${dbPassport!.id}/renew`, { method: "POST", headers: doctorHeaders });
  check("Renew returns 200", res.status === 200);
  const renewed = await res.json();
  check("Renewal count incremented", renewed.renewalCount === 1);
  check("ExpiresAt extended", new Date(renewed.expiresAt).getTime() > dbPassport!.expiresAt.getTime());

  console.log("--- POST revoke ---");
  res = await fetch(`${BASE}/api/passports/${dbPassport!.id}/revoke`, {
    method: "POST", headers: adminHeaders,
    body: JSON.stringify({ revokeReason: "Clinical purpose ended" }),
  });
  check("Revoke returns 200", res.status === 200);
  const revoked = await prisma.accessPassport.findUnique({ where: { id: dbPassport!.id } });
  check("Passport status is REVOKED", revoked?.status === "REVOKED");
  check("Revoke reason saved", revoked?.revokeReason === "Clinical purpose ended");

  console.log("--- POST grant REFERRAL (Cross-hospital) ---");
  res = await fetch(`${BASE}/api/passports`, {
    method: "POST", headers: adminHeaders,
    body: JSON.stringify({
      type: "REFERRAL",
      healthId: "P7B-DOC-0001",
      patientId: patient.id,
      purpose: "Specialist consult",
      scope: ["NOTE", "LAB"],
      duration: "24H" // Should be ignored
    }),
  });
  check("Grant referral returns 201", res.status === 201);
  const referral = await res.json();
  const dbReferral = await prisma.accessPassport.findUnique({ where: { id: referral.id } });
  check("Referral type is REFERRAL", dbReferral?.type === "REFERRAL");
  check("Referral duration forced to 48h", dbReferral!.expiresAt.getTime() > Date.now() + 47 * 3600_000);

  console.log("--- POST deny (create new request first) ---");
  res = await fetch(`${BASE}/api/passport-requests`, {
    method: "POST", headers: doctorHeaders,
    body: JSON.stringify({ patientId: patient.id, purpose: "Urgent" }),
  });
  const req2 = await res.json();
  res = await fetch(`${BASE}/api/passport-requests/${req2.id}/deny`, {
    method: "POST", headers: adminHeaders,
    body: JSON.stringify({ denialReason: "Not justified" }),
  });
  check("Deny returns 200", res.status === 200);
  const denied = await prisma.passportRequest.findUnique({ where: { id: req2.id } });
  check("Request status is DENIED", denied?.status === "DENIED");

  // Cleanup
  await prisma.accessPassport.deleteMany({ where: { patientId: patient.id } });
  await prisma.passportRequest.deleteMany({ where: { patientId: patient.id } });
  await prisma.patient.delete({ where: { id: patient.id } });
  await prisma.user.deleteMany({ where: { hospitalId: { in: [hospitalA.id, hospitalB.id] } } });
  await prisma.hospital.deleteMany({ where: { id: { in: [hospitalA.id, hospitalB.id] } } });
  await prisma.$disconnect();

  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });