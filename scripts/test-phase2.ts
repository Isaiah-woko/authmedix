import "dotenv/config";
import { prisma } from "../lib/prisma";
import { generateHealthId, generatePatientCode, generateTempPassword } from "../lib/id-generators";
import { generateOtpCode, issueLoginCode, verifyLoginCode } from "../lib/otp";
import { rateLimit } from "../lib/rate-limit";
import { writeAuditLog, verifyAuditChain } from "../lib/audit";
import { passwordSchema, breakGlassSchema } from "../lib/validators";
import { canAuthorType, getVisibleFields, getEmergencySummaryFields } from "../lib/role-fields";

let passed = 0;
let failed = 0;
function check(name: string, condition: boolean) {
  if (condition) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.error(`  FAIL  ${name}`); }
}

async function main() {
  console.log("--- Password strength ---");
  check("rejects 8-char password", !passwordSchema.safeParse("Ab1!xxxx").success);
  check("rejects missing symbol", !passwordSchema.safeParse("Password123").success);
  check("rejects missing number", !passwordSchema.safeParse("Password!!!").success);
  check("accepts strong password", passwordSchema.safeParse("Str0ng!Passw0rd").success);

  console.log("--- ID generators ---");
  check("healthId format", generateHealthId("LUTH", "DOCTOR", 23) === "LUTH-DOC-0023");
  check("patientCode format", /^LUTH-PT-\d{5}$/.test(generatePatientCode("LUTH")));
  check("temp password passes strength rule", passwordSchema.safeParse(generateTempPassword()).success);

  console.log("--- OTP format ---");
  check("otp is 6 digits", /^\d{6}$/.test(generateOtpCode()));

  console.log("--- Rate limiter ---");
  const key = `test-${Date.now()}`;
  let allowed = 0;
  for (let i = 0; i < 12; i++) if (rateLimit(key, 10, 60_000).allowed) allowed++;
  check("allows 10 then blocks", allowed === 10);

  console.log("--- Role maps ---");
  check("doctor can author PRESCRIPTION", canAuthorType("DOCTOR", "PRESCRIPTION"));
  check("nurse cannot author PRESCRIPTION", !canAuthorType("NURSE", "PRESCRIPTION"));
  check("pharmacist can author PRESCRIPTION", canAuthorType("PHARMACIST", "PRESCRIPTION"));
  check("lab can author LAB", canAuthorType("LAB", "LAB"));
  check("admin cannot author NOTE", !canAuthorType("ADMIN", "NOTE"));
  check("lab cannot see notes", getVisibleFields("LAB").notes === "hidden");
  check("nurse sees prescriptions view-only", getVisibleFields("NURSE").prescriptions === "view");
  check("emergency summary unfiltered",
    getEmergencySummaryFields().notes === "full" && getEmergencySummaryFields().labs === "full");

  console.log("--- Break-glass validator ---");
  check("rejects confirmedEmergency=false", !breakGlassSchema.safeParse({
    patientId: "x", confirmedEmergency: false, reasonCategory: "TRAUMA",
    reasonDetail: "A long enough justification",
  }).success);
  check("rejects empty reasonDetail", !breakGlassSchema.safeParse({
    patientId: "x", confirmedEmergency: true, reasonCategory: "TRAUMA", reasonDetail: "",
  }).success);

  console.log("--- Hardened OTP (hashed at rest) ---");
  const hospital = await prisma.hospital.create({ data: { code: "TEST", name: "Phase 2 Test Hospital" } });
  const user = await prisma.user.create({
    data: {
      healthId: "TEST-DOC-9999", email: `otp-${Date.now()}@test.local`,
      name: "OTP Test", passwordHash: "not-a-real-hash", role: "DOCTOR", hospitalId: hospital.id,
    },
  });
  const code = await issueLoginCode(user.id);
  const stored = await prisma.loginCode.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  check("code is hashed at rest (codeHash present)", !!stored?.codeHash && stored.codeHash !== code);
  check("per-code salt present", !!stored?.salt);
  check("wrong code rejected", !(await verifyLoginCode(user.id, code === "000000" ? "000001" : "000000")));
  check("correct code accepted", await verifyLoginCode(user.id, code));
  check("code cannot be reused", !(await verifyLoginCode(user.id, code)));

  console.log("--- Tamper-evident audit chain ---");
  // Clean slate so we build a chain from genesis.
  await prisma.auditLog.deleteMany({});
  await writeAuditLog({ action: "TEST_A", outcome: "ALLOWED" });
  const second = await writeAuditLog({ action: "TEST_B", outcome: "DENIED" });
  await writeAuditLog({ action: "TEST_C", outcome: "ALLOWED" });

  const beforeTamper = await verifyAuditChain();
  check("chain valid before tampering", beforeTamper.valid);

  // Simulate an attacker editing a row directly in the DB.
  await prisma.auditLog.update({ where: { id: second.id }, data: { outcome: "ALLOWED" } });
  const afterTamper = await verifyAuditChain();
  check("tampering detected", !afterTamper.valid && afterTamper.brokenAt === second.id);

  // Cleanup
  await prisma.auditLog.deleteMany({});
  await prisma.loginCode.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
  await prisma.hospital.delete({ where: { id: hospital.id } });
  await prisma.$disconnect();

  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });