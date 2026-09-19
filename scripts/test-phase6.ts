import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { issueSessionToken, BCRYPT_ROUNDS } from "../lib/auth";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const COOKIE = "authmedix.session-token";

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.error(`  FAIL  ${name}`); }
}

async function getHeaders(role: "ADMIN" | "DOCTOR" | "NURSE" | "LAB", hospitalId: string) {
  const healthId = `P6T-${role === "ADMIN" ? "ADM" : role === "DOCTOR" ? "DOC" : role === "NURSE" ? "NUR" : "LAB"}-0001`;
  const user = await prisma.user.upsert({
    where: { healthId },
    update: { status: "ACTIVE", mustChangePassword: false },
    create: {
      healthId,
      email: `p6-${role.toLowerCase()}@test.local`,
      name: `P6 ${role}`,
      passwordHash: await bcrypt.hash("Test!Pass1", BCRYPT_ROUNDS),
      role,
      hospitalId,
      mustChangePassword: false,
      sessionTtlHrs: 8,
    },
  });

  const { token } = await issueSessionToken({
    id: user.id,
    healthId: user.healthId,
    role,
    hospitalId: user.hospitalId,
    sessionTtlHrs: 8,
    mustChangePassword: false,
  });

  return { "Content-Type": "application/json", Cookie: `${COOKIE}=${token}` };
}

async function main() {
  console.log(`Phase 6 HTTP tests against ${BASE} — make sure \`pnpm dev\` is running.\n`);

  const hospital = await prisma.hospital.upsert({
    where: { code: "P6T" },
    update: {},
    create: { code: "P6T", name: "Phase 6 Test Hospital" },
  });

  const adminHeaders = await getHeaders("ADMIN", hospital.id);
  const doctorHeaders = await getHeaders("DOCTOR", hospital.id);
  const nurseHeaders = await getHeaders("NURSE", hospital.id);
  const labHeaders = await getHeaders("LAB", hospital.id);

  const doctorUser = await prisma.user.findUnique({ where: { healthId: "P6T-DOC-0001" } });
  const nurseUser = await prisma.user.findUnique({ where: { healthId: "P6T-NUR-0001" } });
  const labUser = await prisma.user.findUnique({ where: { healthId: "P6T-LAB-0001" } });

  console.log("--- POST /api/patients (Register + Care Team) ---");
  let res = await fetch(`${BASE}/api/patients`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      name: "John Doe",
      dob: "1980-01-01",
      allergies: ["Penicillin"],
      careTeam: [
        { userId: doctorUser!.id, purpose: "Primary Care", scope: [], duration: "8H" },
        { userId: nurseUser!.id, purpose: "Nursing", scope: [], duration: "8H" },
        { userId: labUser!.id, purpose: "Lab Work", scope: ["LAB"], duration: "8H" },
      ]
    }),
  });
  check("POST patient returns 201", res.status === 201);
  const newPatient = await res.json();
  check("returns patientCode", !!newPatient.patientCode);

  const passports = await prisma.accessPassport.count({ where: { patientId: newPatient.id, status: "ACTIVE" } });
  check("3 care-team passports created", passports === 3);

  console.log("--- GET /api/patients (Search) ---");
  res = await fetch(`${BASE}/api/patients?query=john`, { headers: doctorHeaders });
  check("GET search returns 200", res.status === 200);
  const searchResults = await res.json();
  check("search returns array", Array.isArray(searchResults));
  check("search finds John Doe", searchResults.some((p: any) => p.name === "John Doe"));
  check("search is identity-only (no allergies)", !searchResults[0].allergies);

  console.log("--- GET /api/patients/:id (Doctor View) ---");
  res = await fetch(`${BASE}/api/patients/${newPatient.id}`, { headers: doctorHeaders });
  check("GET patient returns 200", res.status === 200);
  const doctorView = await res.json();
  check("doctor sees allergies", Array.isArray(doctorView.allergies));
  check("doctor sees passport info", !!doctorView.passport);

  console.log("--- POST /api/records (Doctor creates NOTE) ---");
  res = await fetch(`${BASE}/api/records`, {
    method: "POST",
    headers: doctorHeaders,
    body: JSON.stringify({ patientId: newPatient.id, type: "NOTE", content: "Patient presents with..." }),
  });
  check("POST record returns 201", res.status === 201);
  const newRecord = await res.json();

  const dbRecord = await prisma.record.findUnique({ where: { id: newRecord.id } });
  check("record contentHash is populated", !!dbRecord?.contentHash);

  console.log("--- POST /api/records (Nurse tries PRESCRIPTION - Authoring Denied) ---");
  res = await fetch(`${BASE}/api/records`, {
    method: "POST",
    headers: nurseHeaders,
    body: JSON.stringify({ patientId: newPatient.id, type: "PRESCRIPTION", content: "Amoxicillin 500mg" }),
  });
  check("Nurse creating PRESCRIPTION returns 403", res.status === 403);

  console.log("--- GET /api/patients/:id (Lab View - Role Filtering) ---");
  // Create a LAB record so Lab tech has something to see
  await fetch(`${BASE}/api/records`, {
    method: "POST",
    headers: labHeaders, // <-- FIXED: Lab tech creates their own LAB record
    body: JSON.stringify({ patientId: newPatient.id, type: "LAB", content: "CBC results normal" }),
  });

  res = await fetch(`${BASE}/api/patients/${newPatient.id}`, { headers: labHeaders });
  check("GET patient (Lab) returns 200", res.status === 200);
  const labView = await res.json();
  check("lab cannot see allergies", labView.allergies === undefined);
  check("lab sees LAB records", labView.records.some((r: any) => r.type === "LAB"));
  check("lab cannot see NOTE records", !labView.records.some((r: any) => r.type === "NOTE"));

  console.log("--- GET /api/patients/:id (No Passport - 403) ---");
  const randomPatient = await prisma.patient.create({
    data: { patientCode: "P6T-PT-99999", name: "No Passport", dob: new Date(), hospitalId: hospital.id }
  });
  res = await fetch(`${BASE}/api/patients/${randomPatient.id}`, { headers: doctorHeaders });
  check("GET patient without passport returns 403", res.status === 403);
  const noPassportBody = await res.json();
  check("denyReason is NO_PASSPORT", noPassportBody.reason === "NO_PASSPORT");

  // Cleanup
  await prisma.record.deleteMany({ where: { patientId: { in: [newPatient.id, randomPatient.id] } } });
  await prisma.accessPassport.deleteMany({ where: { patientId: { in: [newPatient.id, randomPatient.id] } } });
  await prisma.patient.deleteMany({ where: { id: { in: [newPatient.id, randomPatient.id] } } });
  await prisma.user.deleteMany({ where: { hospitalId: hospital.id } });
  await prisma.hospital.delete({ where: { id: hospital.id } });
  await prisma.$disconnect();

  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });