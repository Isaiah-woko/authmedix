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

async function getHeaders(role: "ADMIN" | "DOCTOR" | "NURSE", hospitalId: string, healthId: string) {
  const user = await prisma.user.upsert({
    where: { healthId },
    update: { status: "ACTIVE", mustChangePassword: false },
    create: {
      healthId,
      email: `${healthId.toLowerCase()}@phase8.test`,
      name: `P8 ${role}`,
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
  console.log(`Phase 8 HTTP tests against ${BASE} — make sure \`pnpm dev\` is running.\n`);

  const hospital = await prisma.hospital.upsert({ where: { code: "P8T" }, update: {}, create: { code: "P8T", name: "Hospital 8" } });

  const adminHeaders = await getHeaders("ADMIN", hospital.id, "P8T-ADM-0001");
  const doctorHeaders = await getHeaders("DOCTOR", hospital.id, "P8T-DOC-0001");

  const patient = await prisma.patient.upsert({
    where: { patientCode: "P8T-PT-00001" },
    update: {}, // If it already exists from a crashed run, just reuse it
    create: { patientCode: "P8T-PT-00001", name: "P8 Patient", dob: new Date(), hospitalId: hospital.id }
  });

  console.log("--- POST /api/break-glass (Doctor) ---");
  let res = await fetch(`${BASE}/api/break-glass`, {
    method: "POST", headers: doctorHeaders,
    body: JSON.stringify({
      patientId: patient.id,
      confirmedEmergency: true,
      reasonCategory: "LIFE_THREATENING",
      reasonDetail: "Patient in cardiac arrest, need immediate history."
    }),
  });
  check("Break-glass returns 201", res.status === 201);
  const bgBody = await res.json();
  check("Returns passportId", !!bgBody.passportId);

  const dbPassport = await prisma.accessPassport.findUnique({ where: { id: bgBody.passportId } });
  check("Passport type is BREAK_GLASS", dbPassport?.type === "BREAK_GLASS");
  check("Passport is flagged", dbPassport?.flagged === true);
  check("Expires in ~2 hours", dbPassport!.expiresAt.getTime() > Date.now() + 110 * 60_000);
  check("Reason detail saved", dbPassport?.reasonDetail === "Patient in cardiac arrest, need immediate history.");

  console.log("--- POST /api/break-glass (Admin denied) ---");
  res = await fetch(`${BASE}/api/break-glass`, {
    method: "POST", headers: adminHeaders,
    body: JSON.stringify({
      patientId: patient.id,
      confirmedEmergency: true,
      reasonCategory: "TRAUMA",
      reasonDetail: "Admin trying to break glass."
    }),
  });
  check("Admin break-glass returns 403", res.status === 403);

  console.log("--- POST /api/break-glass (Validation) ---");
  res = await fetch(`${BASE}/api/break-glass`, {
    method: "POST", headers: doctorHeaders,
    body: JSON.stringify({
      patientId: patient.id,
      confirmedEmergency: false, // Invalid
      reasonCategory: "TRAUMA",
      reasonDetail: "Test"
    }),
  });
  check("confirmedEmergency=false returns 400", res.status === 400);

  console.log("--- GET /api/admin/audit (Flagged Queue) ---");
  res = await fetch(`${BASE}/api/admin/audit?flagged=true&reviewed=false`, { headers: adminHeaders });
  check("GET audit queue returns 200", res.status === 200);
  const queue = await res.json();
  check("Queue contains the break-glass event", queue.some((e: { id: string }) => e.id === bgBody.passportId));
  check("Events have highPriority computed", typeof queue[0].highPriority === "boolean");

  console.log("--- POST /api/admin/audit/:id/review ---");
  res = await fetch(`${BASE}/api/admin/audit/${bgBody.passportId}/review`, {
    method: "POST", headers: adminHeaders,
    body: JSON.stringify({ reviewNote: "Verified with attending physician." }),
  });
  check("Review returns 200", res.status === 200);

  const reviewedPassport = await prisma.accessPassport.findUnique({ where: { id: bgBody.passportId } });
  check("Passport marked as reviewed", reviewedPassport?.reviewed === true);
  check("Review note saved", reviewedPassport?.reviewNote === "Verified with attending physician.");

  // Queue should now be empty for reviewed=false
  res = await fetch(`${BASE}/api/admin/audit?flagged=true&reviewed=false`, { headers: adminHeaders });
  const emptyQueue = await res.json();
  check("Queue empty after review", emptyQueue.length === 0);

  // Cleanup
  await prisma.accessPassport.deleteMany({ where: { patientId: patient.id } });
  await prisma.auditLog.deleteMany({});
  await prisma.patient.delete({ where: { id: patient.id } });
  await prisma.user.deleteMany({ where: { hospitalId: hospital.id } });
  await prisma.hospital.delete({ where: { id: hospital.id } });
  await prisma.$disconnect();

  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });