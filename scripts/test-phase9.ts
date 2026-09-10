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
      email: `${healthId.toLowerCase()}@phase9.test`,
      name: `P9 ${role}`,
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
  console.log(`Phase 9 HTTP tests against ${BASE} — make sure \`pnpm dev\` is running.\n`);

  const hospital = await prisma.hospital.upsert({ where: { code: "P9T" }, update: {}, create: { code: "P9T", name: "Hospital 9" } });

  const adminHeaders = await getHeaders("ADMIN", hospital.id, "P9T-ADM-0001");
  const doctorHeaders = await getHeaders("DOCTOR", hospital.id, "P9T-DOC-0001");

  const doctorUser = await prisma.user.findUnique({ where: { healthId: "P9T-DOC-0001" } });

  const patient = await prisma.patient.upsert({
    where: { patientCode: "P9T-PT-00001" },
    update: {},
    create: { patientCode: "P9T-PT-00001", name: "P9 Patient", dob: new Date(), hospitalId: hospital.id }
  });

  // Give doctor a passport so they can create a record (which generates an audit log)
  await prisma.accessPassport.upsert({
    where: { id: "p9-passport-id" }, // Force a known ID for easy cleanup later
    update: {},
    create: {
      id: "p9-passport-id",
      userId: doctorUser!.id,
      patientId: patient.id,
      type: "STANDARD",
      status: "ACTIVE",
      purpose: "Test",
      scope: ["NOTE"],
      expiresAt: new Date(Date.now() + 8 * 3600_000),
    }
  });

  console.log("--- Generating Audit Logs ---");
  // 1. Failed login (system level, no userId)
  await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ healthId: "FAKE-ID", email: "fake@test.com", password: "Wrong!Pass1" })
  });

  // 2. Successful record creation
  await fetch(`${BASE}/api/records`, {
    method: "POST",
    headers: doctorHeaders,
    body: JSON.stringify({ patientId: patient.id, type: "NOTE", content: "Test note for audit log" })
  });

  console.log("--- GET /api/audit (All logs) ---");
  let res = await fetch(`${BASE}/api/audit`, { headers: adminHeaders });
  check("GET audit returns 200", res.status === 200);
  const allLogs = await res.json();
  check("Returns logs array", Array.isArray(allLogs.logs));
  check("Returns total count", typeof allLogs.total === "number");
  check("Total is > 0", allLogs.total > 0);

  console.log("--- GET /api/audit (Filter by action) ---");
  res = await fetch(`${BASE}/api/audit?action=CREATE_RECORD`, { headers: adminHeaders });
  const recordLogs = await res.json();
  check("Filter by action works", recordLogs.logs.every((l: any) => l.action === "CREATE_RECORD"));

  console.log("--- GET /api/audit (Filter by user) ---");
  res = await fetch(`${BASE}/api/audit?userId=${doctorUser!.id}`, { headers: adminHeaders });
  const userLogs = await res.json();
  check("Filter by userId works", userLogs.logs.every((l: any) => l.userId === doctorUser!.id));

  console.log("--- GET /api/audit (Pagination) ---");
  res = await fetch(`${BASE}/api/audit?limit=1&offset=0`, { headers: adminHeaders });
  const paginated = await res.json();
  check("Limit restricts array length", paginated.logs.length <= 1);
  check("Total remains accurate", paginated.total === allLogs.total);

  console.log("--- GET /api/audit (Cross-hospital scoping) ---");
  // Create a second hospital and admin
  const hospital2 = await prisma.hospital.create({ data: { code: "P9X", name: "Hospital X" } });
  const admin2Headers = await getHeaders("ADMIN", hospital2.id, "P9X-ADM-0001");

  res = await fetch(`${BASE}/api/audit`, { headers: admin2Headers });
  const hospital2Logs = await res.json();
  // Admin 2 should only see the system-level failed login (userId: null), not the doctor's record creation
  const hasDoctorLog = hospital2Logs.logs.some((l: any) => l.userId === doctorUser!.id);
  check("Admin cannot see other hospital's user logs", !hasDoctorLog);

  // Cleanup
  await prisma.record.deleteMany({ where: { patientId: patient.id } });
  await prisma.accessPassport.deleteMany({ where: { patientId: patient.id } });
  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { patientId: patient.id },
        { userId: doctorUser!.id },
        { action: "LOGIN_FAILED", outcome: "DENIED" } // The fake login
      ]
    }
  });
  await prisma.patient.delete({ where: { id: patient.id } });
  await prisma.user.deleteMany({ where: { hospitalId: { in: [hospital.id, hospital2.id] } } });
  await prisma.hospital.deleteMany({ where: { id: { in: [hospital.id, hospital2.id] } } });
  await prisma.$disconnect();

  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });