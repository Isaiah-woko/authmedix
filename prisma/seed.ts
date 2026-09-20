import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { writeAuditLog } from "../lib/audit";
import { sha256 } from "../lib/hash";

const BCRYPT_ROUNDS = 12;

async function main() {
  console.log("🌱 Seeding AuthMedix database...\n");

  // 1. Cleanup (idempotent)
  console.log("🧹 Cleaning up existing data...");
  await prisma.auditLog.deleteMany({});
  await prisma.loginCode.deleteMany({});
  await prisma.record.deleteMany({});
  await prisma.passportRequest.deleteMany({});
  await prisma.accessPassport.deleteMany({});
  await prisma.patient.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.hospital.deleteMany({});

  // 2. Hospitals
  console.log("🏥 Creating hospitals...");
  const luth = await prisma.hospital.create({ data: { code: "LUTH", name: "Lagos University Teaching Hospital" } });
  const rsh = await prisma.hospital.create({ data: { code: "RSH", name: "Rivers State Hospital" } });

  // 3. Users — every account state the UI can render
  console.log("👥 Creating staff...");
  const hash = (pw: string) => bcrypt.hash(pw, BCRYPT_ROUNDS);

  const users = {
    admin: await prisma.user.create({ data: { healthId: "LUTH-ADM-0001", name: "Admin User", email: "virtualvoyager012+admin@gmail.com", passwordHash: await hash("LUTHadmin1!"), role: "ADMIN", hospitalId: luth.id, mustChangePassword: false, sessionTtlHrs: 4 } }),
    doc: await prisma.user.create({ data: { healthId: "LUTH-DOC-0001", name: "Dr. Adebayo", email: "virtualvoyager012+doc@gmail.com", passwordHash: await hash("LUTHdoc123!"), role: "DOCTOR", hospitalId: luth.id, mustChangePassword: false, sessionTtlHrs: 8 } }),
    docNew: await prisma.user.create({ data: { healthId: "LUTH-DOC-0002", name: "Dr. Amara", email: "virtualvoyager012+amara@gmail.com", passwordHash: await hash("AmaraTemp@26"), role: "DOCTOR", hospitalId: luth.id, mustChangePassword: true, sessionTtlHrs: 8 } }),
    docSuspended: await prisma.user.create({ data: { healthId: "LUTH-DOC-0003", name: "Dr. Ifeoma", email: "virtualvoyager012+ifeoma@gmail.com", passwordHash: await hash("LUTHifeoma1!"), role: "DOCTOR", hospitalId: luth.id, mustChangePassword: false, status: "SUSPENDED", sessionTtlHrs: 8 } }),
    nurse: await prisma.user.create({ data: { healthId: "LUTH-NUR-0001", name: "Nurse Chioma", email: "virtualvoyager012+nurse@gmail.com", passwordHash: await hash("LUTHnurse1!"), role: "NURSE", hospitalId: luth.id, mustChangePassword: false, sessionTtlHrs: 6 } }),
    nurseLocked: await prisma.user.create({ data: { healthId: "LUTH-NUR-0002", name: "Nurse Tunde", email: "virtualvoyager012+tunde@gmail.com", passwordHash: await hash("LUTHtunde1!"), role: "NURSE", hospitalId: luth.id, mustChangePassword: false, status: "LOCKED", failedLoginAttempts: 5, sessionTtlHrs: 6 } }),
    pharm: await prisma.user.create({ data: { healthId: "LUTH-PHA-0001", name: "Pharm. Emeka", email: "virtualvoyager012+pharm@gmail.com", passwordHash: await hash("LUTHpharm1!"), role: "PHARMACIST", hospitalId: luth.id, mustChangePassword: false, sessionTtlHrs: 8 } }),
    lab: await prisma.user.create({ data: { healthId: "LUTH-LAB-0001", name: "Lab Tech Yusuf", email: "virtualvoyager012+lab@gmail.com", passwordHash: await hash("LUTHlab123!"), role: "LAB", hospitalId: luth.id, mustChangePassword: false, sessionTtlHrs: 8 } }),
    rshDoc: await prisma.user.create({ data: { healthId: "RSH-DOC-0001", name: "Dr. Obi", email: "virtualvoyager012+rshdoc@gmail.com", passwordHash: await hash("RSHdoc1234!"), role: "DOCTOR", hospitalId: rsh.id, mustChangePassword: false, sessionTtlHrs: 8 } }),
  };

  // 4. Patients
  console.log("🛏️ Creating patients...");
  const patients = {
    adaeze: await prisma.patient.create({ data: { patientCode: "LUTH-PT-10001", name: "Adaeze Okafor", dob: new Date("1985-04-12"), allergies: ["Penicillin", "Peanuts"], hospitalId: luth.id } }),
    chinedu: await prisma.patient.create({ data: { patientCode: "LUTH-PT-10002", name: "Chinedu Eze", dob: new Date("1992-08-23"), allergies: ["Sulfa drugs"], hospitalId: luth.id } }),
    ngozi: await prisma.patient.create({ data: { patientCode: "LUTH-PT-10003", name: "Ngozi Bello", dob: new Date("1978-11-05"), allergies: ["Latex"], hospitalId: luth.id } }),
    emeka: await prisma.patient.create({ data: { patientCode: "LUTH-PT-10004", name: "Emeka Nnaji", dob: new Date("1965-02-14"), allergies: ["Ibuprofen"], hospitalId: luth.id } }),
    fatima: await prisma.patient.create({ data: { patientCode: "LUTH-PT-10005", name: "Fatima Yusuf", dob: new Date("2001-09-30"), allergies: ["Codeine"], hospitalId: luth.id } }),
    musa: await prisma.patient.create({ data: { patientCode: "LUTH-PT-10006", name: "Musa Bello", dob: new Date("1988-06-19"), allergies: ["Aspirin"], hospitalId: luth.id } }),
    grace: await prisma.patient.create({ data: { patientCode: "LUTH-PT-10007", name: "Grace Obi", dob: new Date("1995-03-02"), allergies: [], hospitalId: luth.id } }),
    kelechi: await prisma.patient.create({ data: { patientCode: "RSH-PT-20001", name: "Kelechi Woko", dob: new Date("1970-12-25"), allergies: ["Morphine"], hospitalId: rsh.id } }),
  };

  // 5. Records (tamper-evident hashes)
  console.log("📝 Creating clinical records...");
  const R = (content: string) => ({ content, contentHash: sha256(content) });
  const noteAdaeze = R("Patient presents with persistent cough and mild fever. Prescribed Amoxicillin. Follow up in 3 days.");
  const labAdaeze = R("CBC results normal. WBC count slightly elevated.");
  const rxAdaeze = R("Amoxicillin 500mg, 1 capsule 3x daily for 7 days.");
  const upAdaeze = R("Chest X-ray uploaded: no acute infiltrates.");
  const noteFatima = R("Emergency admission following road traffic accident. Multiple contusions, GCS 13 on arrival.");
  const labFatima = R("Emergency panel: Hb 11.2, otherwise within normal limits.");
  rxFatimaGuard: {
    // block label unused; kept simple below
  }
  const rxFatima = R("Paracetamol 1g IV 8-hourly. Withhold codeine-containing products (allergy).");
  const upFatima = R("X-ray image of left tibia uploaded.");
  const noteMusa = R("Type 2 diabetes, hypertension. Stable on current regimen, review in 4 weeks.");
  const labMusa = R("HbA1c 7.1%, eGFR 88 — stable.");
  const rxMusa = R("Metformin 1g BD, Amlodipine 5mg OD. Continue.");
  const noteChinedu = R("Reviewed for palpitations. ECG requested, awaiting cardiology input.");
  const labChinedu = R("Thyroid panel pending.");
  const noteNgozi = R("Post-op day 3, wound clean, mobilising well.");
  const rxNgozi = R("Analgesia step-down: Paracetamol PO only.");
  const noteEmeka = R("Routine review, no acute concerns.");
  const noteKelechi = R("Admitted for observation following syncope. Cardiology review planned.");
  const labKelechi = R("Troponin negative x2, 6h apart.");

  await prisma.record.createMany({ data: [
    { patientId: patients.adaeze.id, authorId: users.doc.id, type: "NOTE", ...noteAdaeze },
    { patientId: patients.adaeze.id, authorId: users.lab.id, type: "LAB", ...labAdaeze },
    { patientId: patients.adaeze.id, authorId: users.pharm.id, type: "PRESCRIPTION", ...rxAdaeze },
    { patientId: patients.adaeze.id, authorId: users.nurse.id, type: "UPLOAD", ...upAdaeze },
    { patientId: patients.fatima.id, authorId: users.doc.id, type: "NOTE", ...noteFatima },
    { patientId: patients.fatima.id, authorId: users.lab.id, type: "LAB", ...labFatima },
    { patientId: patients.fatima.id, authorId: users.pharm.id, type: "PRESCRIPTION", ...rxFatima },
    { patientId: patients.fatima.id, authorId: users.nurse.id, type: "UPLOAD", ...upFatima },
    { patientId: patients.musa.id, authorId: users.doc.id, type: "NOTE", ...noteMusa },
    { patientId: patients.musa.id, authorId: users.lab.id, type: "LAB", ...labMusa },
    { patientId: patients.musa.id, authorId: users.pharm.id, type: "PRESCRIPTION", ...rxMusa },
    { patientId: patients.chinedu.id, authorId: users.docSuspended.id, type: "NOTE", ...noteChinedu },
    { patientId: patients.chinedu.id, authorId: users.lab.id, type: "LAB", ...labChinedu },
    { patientId: patients.ngozi.id, authorId: users.doc.id, type: "NOTE", ...noteNgozi },
    { patientId: patients.ngozi.id, authorId: users.pharm.id, type: "PRESCRIPTION", ...rxNgozi },
    { patientId: patients.emeka.id, authorId: users.doc.id, type: "NOTE", ...noteEmeka },
    { patientId: patients.kelechi.id, authorId: users.rshDoc.id, type: "NOTE", ...noteKelechi },
    { patientId: patients.kelechi.id, authorId: users.rshDoc.id, type: "LAB", ...labKelechi },
  ] });
  // NOTE: Grace intentionally has ZERO records (empty-records state)

  const now = Date.now();
  const H2 = 2 * 3600_000, H8 = 8 * 3600_000, H24 = 24 * 3600_000, H48 = 48 * 3600_000;
  const ALL = ["NOTE", "LAB", "PRESCRIPTION", "UPLOAD"];

  // 6. Passports — every type, every status
  console.log("🛂 Creating passports...");
  await prisma.accessPassport.createMany({ data: [
    // Adaeze: active care team + cross-hospital referral
    { userId: users.doc.id, patientId: patients.adaeze.id, type: "STANDARD", status: "ACTIVE", purpose: "Primary care", scope: ALL, expiresAt: new Date(now + H8), grantedById: users.admin.id },
    { userId: users.nurse.id, patientId: patients.adaeze.id, type: "STANDARD", status: "ACTIVE", purpose: "Nursing care", scope: ALL, expiresAt: new Date(now + H8), grantedById: users.admin.id, renewalCount: 1 },
    { userId: users.rshDoc.id, patientId: patients.adaeze.id, type: "REFERRAL", status: "ACTIVE", purpose: "Specialist cardiology consultation", scope: ["NOTE", "LAB"], expiresAt: new Date(now + H48), grantedById: users.admin.id },
    // Ngozi: EXPIRED for doc
    { userId: users.doc.id, patientId: patients.ngozi.id, type: "STANDARD", status: "EXPIRED", purpose: "Post-op follow up", scope: ["NOTE"], expiresAt: new Date(now - 3600_000), grantedById: users.admin.id },
    // Emeka: REVOKED for doc
    { userId: users.doc.id, patientId: patients.emeka.id, type: "STANDARD", status: "REVOKED", purpose: "Routine check", scope: ["NOTE"], expiresAt: new Date(now + H8), grantedById: users.admin.id, revokedById: users.admin.id, revokedAt: new Date(now - 1800_000), revokeReason: "Patient transferred to another facility" },
    // Fatima: ACTIVE break-glass for nurse (2h countdown, unreviewed)
    { userId: users.nurse.id, patientId: patients.fatima.id, type: "BREAK_GLASS", status: "ACTIVE", purpose: "Emergency access", scope: ALL, expiresAt: new Date(now + H2), reasonCategory: "TRAUMA", reasonDetail: "Patient unconscious following RTA; immediate allergy and medication history required.", flagged: true, reviewed: false },
    // Emeka: SECOND, older break-glass for nurse → repeat-use + multi-patient high-priority signal
    { userId: users.nurse.id, patientId: patients.emeka.id, type: "BREAK_GLASS", status: "EXPIRED", purpose: "Emergency access", scope: ALL, expiresAt: new Date(now - 20 * 3600_000), reasonCategory: "MEDICATION_ALLERGY_EMERGENCY", reasonDetail: "Suspected adverse drug reaction; needed full medication list immediately.", flagged: true, reviewed: false },
    // Ngozi: older break-glass for doc, already REVIEWED
    { userId: users.doc.id, patientId: patients.ngozi.id, type: "BREAK_GLASS", status: "EXPIRED", purpose: "Emergency access", scope: ALL, expiresAt: new Date(now - 3 * 24 * 3600_000), reasonCategory: "LIFE_THREATENING", reasonDetail: "Anaphylaxis suspected in ward; latex and drug allergy history required.", flagged: true, reviewed: true, reviewedById: users.admin.id, reviewedAt: new Date(now - 2 * 24 * 3600_000), reviewNote: "Reviewed: legitimate emergency, documentation complete." },
    // Musa: 24h extended episode for doc + 8h for pharmacist (via approved request)
    { userId: users.doc.id, patientId: patients.musa.id, type: "STANDARD", status: "ACTIVE", purpose: "Extended clinical episode", scope: ALL, expiresAt: new Date(now + H24), grantedById: users.admin.id },
    // Grace: active passport, zero records
    { userId: users.doc.id, patientId: patients.grace.id, type: "STANDARD", status: "ACTIVE", purpose: "Primary care", scope: ALL, expiresAt: new Date(now + H8), grantedById: users.admin.id },
    // Kelechi: RSH doc's own patient
    { userId: users.rshDoc.id, patientId: patients.kelechi.id, type: "STANDARD", status: "ACTIVE", purpose: "Primary care", scope: ALL, expiresAt: new Date(now + H8), grantedById: users.admin.id },
    // Ifeoma (suspended): auto-revoked passport
    { userId: users.docSuspended.id, patientId: patients.adaeze.id, type: "STANDARD", status: "REVOKED", purpose: "Cardiology input", scope: ["NOTE", "LAB"], expiresAt: new Date(now + H8), grantedById: users.admin.id, revokedById: users.admin.id, revokedAt: new Date(now - 26 * 3600_000), revokeReason: "Account suspended" },
  ] });

  // Pharmacist's Musa passport created separately so the approved request can reference it
  const pharmMusaPassport = await prisma.accessPassport.create({ data: { userId: users.pharm.id, patientId: patients.musa.id, type: "STANDARD", status: "ACTIVE", purpose: "Medication review and dispensing", scope: ALL, expiresAt: new Date(now + H8), grantedById: users.admin.id } });

  // 7. Requests — pending (x2), approved, denied
  console.log("📨 Creating passport requests...");
  await prisma.passportRequest.createMany({ data: [
    { requesterId: users.doc.id, patientId: patients.chinedu.id, purpose: "Second opinion on cardiology report", scope: ["NOTE", "LAB"], status: "PENDING" },
    { requesterId: users.pharm.id, patientId: patients.ngozi.id, purpose: "Medication reconciliation post-surgery", scope: ["PRESCRIPTION", "NOTE"], status: "PENDING" },
    { requesterId: users.pharm.id, patientId: patients.musa.id, purpose: "Diabetes regimen review", scope: ["PRESCRIPTION"], status: "APPROVED", reviewedById: users.admin.id, reviewedAt: new Date(now - 3 * 3600_000), resultingPassportId: pharmMusaPassport.id },
    { requesterId: users.lab.id, patientId: patients.adaeze.id, purpose: "Full record review", scope: ALL, status: "DENIED", reviewedById: users.admin.id, reviewedAt: new Date(now - 5 * 3600_000), denialReason: "Lab access is scoped to own orders; request specific lab review instead." },
  ] });

  // 8. Audit history (hash chain preserved via writeAuditLog)
  console.log("📜 Seeding audit history...");
  await writeAuditLog({ userId: users.admin.id, action: "SEED_DATA_LOADED", outcome: "ALLOWED", reason: "Demo data seeded successfully." });
  await writeAuditLog({ userId: users.doc.id, action: "LOGIN_SUCCESS", outcome: "ALLOWED" });
  await writeAuditLog({ userId: users.nurseLocked.id, action: "LOGIN_FAILED", outcome: "DENIED", reason: "INVALID_CREDENTIALS" });
  await writeAuditLog({ userId: users.nurseLocked.id, action: "LOGIN_FAILED", outcome: "DENIED", reason: "ACCOUNT_LOCKED" });
  await writeAuditLog({ userId: users.lab.id, patientId: patients.adaeze.id, action: "VIEW_RECORD", outcome: "DENIED", reason: "NO_PASSPORT" });
  await writeAuditLog({ userId: users.doc.id, patientId: patients.chinedu.id, action: "REQUEST_ACCESS", outcome: "ALLOWED", reason: "Requested access for second opinion" });
  await writeAuditLog({ userId: users.admin.id, patientId: patients.musa.id, action: "PASSPORT_GRANTED", outcome: "ALLOWED", reason: "Granted STANDARD 8h passport to LUTH-PHA-0001" });
  await writeAuditLog({ userId: users.admin.id, patientId: patients.adaeze.id, action: "PASSPORT_REQUEST_DENIED", outcome: "DENIED", reason: "Lab access scoped to own orders" });
  await writeAuditLog({ userId: users.nurse.id, patientId: patients.emeka.id, action: "BREAK_GLASS", outcome: "ALLOWED", reason: "MEDICATION_ALLERGY_EMERGENCY" });
  await writeAuditLog({ userId: users.nurse.id, patientId: patients.fatima.id, action: "BREAK_GLASS", outcome: "ALLOWED", reason: "TRAUMA" });
  await writeAuditLog({ userId: users.doc.id, patientId: patients.ngozi.id, action: "BREAK_GLASS", outcome: "ALLOWED", reason: "LIFE_THREATENING" });
  await writeAuditLog({ userId: users.admin.id, patientId: patients.ngozi.id, action: "FLAGGED_REVIEWED", outcome: "ALLOWED", reason: "Legitimate emergency, documentation complete" });
  await writeAuditLog({ userId: users.nurse.id, patientId: patients.adaeze.id, action: "PASSPORT_RENEWED", outcome: "ALLOWED" });
  await writeAuditLog({ userId: users.admin.id, patientId: patients.emeka.id, action: "PASSPORT_REVOKED", outcome: "ALLOWED", reason: "Patient transferred to another facility" });
  await writeAuditLog({ userId: users.admin.id, action: "STAFF_SUSPENDED", outcome: "ALLOWED", reason: "Suspended LUTH-DOC-0003; active passports auto-revoked" });
  await writeAuditLog({ userId: users.doc.id, patientId: patients.adaeze.id, action: "VIEW_RECORD", outcome: "ALLOWED" });

  // 9. Credentials
  console.log("\n✅ SEEDING COMPLETE — demo credentials:\n");
  console.log("LUTH ADMIN      LUTH-ADM-0001 / LUTHadmin1!");
  console.log("LUTH DOCTOR     LUTH-DOC-0001 / LUTHdoc123!   (active, expired, revoked, 24h, pending request)");
  console.log("LUTH NEW DOC    LUTH-DOC-0002 / AmaraTemp@26  (mustChangePassword → Set-Password screen)");
  console.log("LUTH SUSPENDED  LUTH-DOC-0003 / LUTHifeoma1!  (suspended; passports auto-revoked)");
  console.log("LUTH NURSE      LUTH-NUR-0001 / LUTHnurse1!   (active break-glass + repeat offender)");
  console.log("LUTH LOCKED     LUTH-NUR-0002 / LUTHtunde1!   (locked state)");
  console.log("LUTH PHARM      LUTH-PHA-0001 / LUTHpharm1!   (role-filtered view)");
  console.log("LUTH LAB        LUTH-LAB-0001 / LUTHlab123!   (EMPTY dashboard, no passports)");
  console.log("RSH DOCTOR      RSH-DOC-0001 / RSHdoc1234!    (cross-hospital referral)");
  console.log("\n⏰ Break-glass countdowns and 8h/24h/48h expiries are relative to seed time — re-seed right before screenshots/recording.");
}

main()
  .catch((e) => { console.error("❌ Seeding failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });