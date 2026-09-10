import "dotenv/config";
import { prisma } from "../lib/prisma";
import { checkAccess, requireAuth, DURATION_MS } from "../lib/access-control";
import { verifyAuditChain } from "../lib/audit";
import type { Role } from "@prisma/client";

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.error(`  FAIL  ${name}`); }
}

// ── Helpers ──

let hospitalId: string;
const userIds: Record<string, string> = {};
const patientIds: Record<string, string> = {};

async function makeUser(healthId: string, role: Role, status: "ACTIVE" | "SUSPENDED" = "ACTIVE") {
  const u = await prisma.user.create({
    data: {
      healthId,
      email: `${healthId.toLowerCase()}@phase4.test`,
      name: `Phase4 ${role}`,
      passwordHash: "not-a-real-hash",
      role,
      status,
      hospitalId,
      mustChangePassword: false,
      sessionTtlHrs: 8,
    },
  });
  userIds[healthId] = u.id;
  return u;
}

async function makePatient(code: string) {
  const p = await prisma.patient.create({
    data: {
      patientCode: code,
      name: `Patient ${code}`,
      dob: new Date("1990-01-01"),
      allergies: ["Penicillin"],
      hospitalId,
    },
  });
  patientIds[code] = p.id;
  return p;
}

async function makePassport(
  userId: string,
  patientId: string,
  opts: {
    type?: "STANDARD" | "REFERRAL" | "BREAK_GLASS";
    status?: "ACTIVE" | "EXPIRED" | "REVOKED";
    expiresAt?: Date;
    scope?: string[];
    flagged?: boolean;
  } = {},
) {
  return prisma.accessPassport.create({
    data: {
      userId,
      patientId,
      type: opts.type ?? "STANDARD",
      status: opts.status ?? "ACTIVE",
      purpose: "Phase 4 test",
      scope: opts.scope ?? [],
      expiresAt: opts.expiresAt ?? new Date(Date.now() + DURATION_MS["8H"]),
      flagged: opts.flagged ?? false,
      ...(opts.type === "BREAK_GLASS"
        ? { reasonCategory: "TRAUMA" as const, reasonDetail: "Test justification for phase 4" }
        : {}),
    },
  });
}

// ── Main ──

async function main() {
  // Clean audit slate so chain verification is clean.
  await prisma.auditLog.deleteMany({});

  // Setup
  const hospital = await prisma.hospital.create({
    data: { code: "P4T", name: "Phase 4 Test Hospital" },
  });
  hospitalId = hospital.id;

  await makeUser("P4T-DOC-0001", "DOCTOR");
  await makeUser("P4T-NUR-0001", "NURSE");
  await makeUser("P4T-PHA-0001", "PHARMACIST");
  await makeUser("P4T-LAB-0001", "LAB");
  await makeUser("P4T-ADM-0001", "ADMIN");
  await makeUser("P4T-DOC-0002", "DOCTOR", "SUSPENDED");

  await makePatient("P4T-PT-00001"); // active passport
  await makePatient("P4T-PT-00002"); // expired passport
  await makePatient("P4T-PT-00003"); // revoked passport
  await makePatient("P4T-PT-00004"); // no passport
  await makePatient("P4T-PT-00005"); // break-glass passport
  await makePatient("P4T-PT-00006"); // scope-restricted passport
  await makePatient("P4T-PT-00007"); // suspended user's passport

  // Active standard passport for doctor on patient 1
  await makePassport(userIds["P4T-DOC-0001"], patientIds["P4T-PT-00001"]);

  // Expired passport for doctor on patient 2
  await makePassport(userIds["P4T-DOC-0001"], patientIds["P4T-PT-00002"], {
    expiresAt: new Date(Date.now() - 3_600_000),
  });

  // Revoked passport for doctor on patient 3
  await makePassport(userIds["P4T-DOC-0001"], patientIds["P4T-PT-00003"], {
    status: "REVOKED",
  });

  // No passport for doctor on patient 4 (don't create one)

  // Break-glass passport for nurse on patient 5
  await makePassport(userIds["P4T-NUR-0001"], patientIds["P4T-PT-00005"], {
    type: "BREAK_GLASS",
    flagged: true,
  });

  // Scope-restricted passport for pharmacist on patient 6 (only PRESCRIPTION scope)
  await makePassport(userIds["P4T-PHA-0001"], patientIds["P4T-PT-00006"], {
    scope: ["PRESCRIPTION"],
  });

  // Active passport for the suspended doctor on patient 7
  await makePassport(userIds["P4T-DOC-0002"], patientIds["P4T-PT-00007"]);

  // Also give the nurse an active passport on patient 1 (for role-filter comparison)
  await makePassport(userIds["P4T-NUR-0001"], patientIds["P4T-PT-00001"]);

  // ── Tests ──

  console.log("--- SEARCH short-circuit ---");
  const searchResult = await checkAccess({
    userId: userIds["P4T-DOC-0001"],
    patientId: patientIds["P4T-PT-00004"],
    action: "SEARCH",
  });
  check("SEARCH always allowed", searchResult.allowed === true);
  check("SEARCH has no denyReason", searchResult.denyReason === undefined);

  console.log("--- NO_PASSPORT ---");
  const noPassport = await checkAccess({
    userId: userIds["P4T-DOC-0001"],
    patientId: patientIds["P4T-PT-00004"],
    action: "VIEW_PATIENT",
  });
  check("no passport → denied", noPassport.allowed === false);
  check("denyReason is NO_PASSPORT", noPassport.denyReason === "NO_PASSPORT");

  console.log("--- PASSPORT_EXPIRED ---");
  const expired = await checkAccess({
    userId: userIds["P4T-DOC-0001"],
    patientId: patientIds["P4T-PT-00002"],
    action: "VIEW_PATIENT",
  });
  check("expired passport → denied", expired.allowed === false);
  check("denyReason is PASSPORT_EXPIRED", expired.denyReason === "PASSPORT_EXPIRED");

  console.log("--- PASSPORT_REVOKED ---");
  const revoked = await checkAccess({
    userId: userIds["P4T-DOC-0001"],
    patientId: patientIds["P4T-PT-00003"],
    action: "VIEW_PATIENT",
  });
  check("revoked passport → denied", revoked.allowed === false);
  check("denyReason is PASSPORT_REVOKED", revoked.denyReason === "PASSPORT_REVOKED");

  console.log("--- ACTIVE passport → allowed ---");
  const active = await checkAccess({
    userId: userIds["P4T-DOC-0001"],
    patientId: patientIds["P4T-PT-00001"],
    action: "VIEW_PATIENT",
  });
  check("active passport → allowed", active.allowed === true);
  check("passport object returned", active.passport !== undefined);
  check("passport type is STANDARD", active.passport?.type === "STANDARD");

  console.log("--- Role-based field filtering (Doctor) ---");
  check("doctor sees notes=full", active.visibility?.notes === "full");
  check("doctor sees labs=full", active.visibility?.labs === "full");
  check("doctor sees prescriptions=full", active.visibility?.prescriptions === "full");
  check("doctor sees uploads=full", active.visibility?.uploads === "full");
  check("doctor sees allergies=full", active.visibility?.allergies === "full");

  console.log("--- Role-based field filtering (Nurse) ---");
  const nurseAccess = await checkAccess({
    userId: userIds["P4T-NUR-0001"],
    patientId: patientIds["P4T-PT-00001"],
    action: "VIEW_PATIENT",
  });
  check("nurse allowed", nurseAccess.allowed === true);
  check("nurse sees notes=full", nurseAccess.visibility?.notes === "full");
  check("nurse sees prescriptions=view", nurseAccess.visibility?.prescriptions === "view");
  check("nurse sees uploads=view", nurseAccess.visibility?.uploads === "view");

  console.log("--- Break-glass Emergency Summary (Nurse) ---");
  const bgAccess = await checkAccess({
    userId: userIds["P4T-NUR-0001"],
    patientId: patientIds["P4T-PT-00005"],
    action: "VIEW_PATIENT",
  });
  check("break-glass → allowed", bgAccess.allowed === true);
  check("break-glass passport type", bgAccess.passport?.type === "BREAK_GLASS");
  check("break-glass overrides role: notes=full (not nurse's normal)", bgAccess.visibility?.notes === "full");
  check("break-glass overrides role: prescriptions=full (nurse normally=view)", bgAccess.visibility?.prescriptions === "full");
  check("break-glass overrides role: uploads=full (nurse normally=view)", bgAccess.visibility?.uploads === "full");
  check("break-glass allergies=full", bgAccess.visibility?.allergies === "full");

  console.log("--- Scope check ---");
  const scopeOk = await checkAccess({
    userId: userIds["P4T-PHA-0001"],
    patientId: patientIds["P4T-PT-00006"],
    action: "VIEW_RECORD",
    requiredScope: "PRESCRIPTION",
  });
  check("scope PRESCRIPTION covered → allowed", scopeOk.allowed === true);

  const scopeFail = await checkAccess({
    userId: userIds["P4T-PHA-0001"],
    patientId: patientIds["P4T-PT-00006"],
    action: "VIEW_RECORD",
    requiredScope: "LAB",
  });
  check("scope LAB not covered → denied", scopeFail.allowed === false);
  check("denyReason is ROLE_DENIED", scopeFail.denyReason === "ROLE_DENIED");

  console.log("--- Suspended user denied ---");
  const suspended = await checkAccess({
    userId: userIds["P4T-DOC-0002"],
    patientId: patientIds["P4T-PT-00007"],
    action: "VIEW_PATIENT",
  });
  check("suspended user → denied", suspended.allowed === false);
  check("denyReason is INACTIVE_SESSION", suspended.denyReason === "INACTIVE_SESSION");

  console.log("--- Admin denied clinical access ---");
  // Give admin a passport to prove it's the ROLE filter that blocks, not missing passport.
  await makePassport(userIds["P4T-ADM-0001"], patientIds["P4T-PT-00001"]);
  const adminAccess = await checkAccess({
    userId: userIds["P4T-ADM-0001"],
    patientId: patientIds["P4T-PT-00001"],
    action: "VIEW_PATIENT",
  });
  check("admin allowed (has passport)", adminAccess.allowed === true);
  check("admin sees notes=hidden", adminAccess.visibility?.notes === "hidden");
  check("admin sees labs=hidden", adminAccess.visibility?.labs === "hidden");
  check("admin sees prescriptions=hidden", adminAccess.visibility?.prescriptions === "hidden");
  check("admin sees allergies=hidden", adminAccess.visibility?.allergies === "hidden");

  console.log("--- Audit chain integrity ---");
  const auditCount = await prisma.auditLog.count();
  check("audit entries written for all access attempts", auditCount > 0);

  const chainValid = await verifyAuditChain();
  check("audit chain intact after all operations", chainValid.valid);

  // Spot-check: denied attempts are in the log
  const deniedLogs = await prisma.auditLog.findMany({ where: { outcome: "DENIED" } });
  check("denied attempts are audit-logged", deniedLogs.length >= 5);

  const allowedLogs = await prisma.auditLog.findMany({ where: { outcome: "ALLOWED" } });
  check("allowed attempts are audit-logged", allowedLogs.length >= 3);

  // ── Cleanup ──
  const allUserIds = Object.values(userIds);
  const allPatientIds = Object.values(patientIds);
  await prisma.accessPassport.deleteMany({ where: { userId: { in: allUserIds } } });
  await prisma.passportRequest.deleteMany({ where: { requesterId: { in: allUserIds } } });
  await prisma.loginCode.deleteMany({ where: { userId: { in: allUserIds } } });
  await prisma.record.deleteMany({ where: { authorId: { in: allUserIds } } });
  await prisma.auditLog.deleteMany({});
  await prisma.user.deleteMany({ where: { id: { in: allUserIds } } });
  await prisma.patient.deleteMany({ where: { id: { in: allPatientIds } } });
  await prisma.hospital.delete({ where: { id: hospitalId } });
  await prisma.$disconnect();

  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});