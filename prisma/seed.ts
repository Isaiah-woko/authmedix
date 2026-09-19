import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { writeAuditLog } from "../lib/audit";
import { sha256 } from "../lib/hash";

const BCRYPT_ROUNDS = 12;

async function main() {
  console.log("🌱 Seeding AuthMedix database...\n");

  // 1. Cleanup existing data (idempotent seeding)
  console.log("🧹 Cleaning up existing data...");
  await prisma.auditLog.deleteMany({});
  await prisma.loginCode.deleteMany({});
  await prisma.record.deleteMany({});
  await prisma.passportRequest.deleteMany({});
  await prisma.accessPassport.deleteMany({});
  await prisma.patient.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.hospital.deleteMany({});

  // 2. Create Hospitals
  console.log("🏥 Creating hospitals...");
  const luth = await prisma.hospital.create({
    data: { code: "LUTH", name: "Lagos University Teaching Hospital" },
  });
  const rsh = await prisma.hospital.create({
    data: { code: "RSH", name: "Rivers State Hospital" },
  });

  // 3. Create Users
  // NOTE: We use Gmail "+" aliases. They are unique in the database,
  // but Gmail delivers ALL of them to your main virtualvoyager012@gmail.com inbox!
  console.log("👥 Creating staff...");
  const hash = (pw: string) => bcrypt.hash(pw, BCRYPT_ROUNDS);

  const users = {
    luthAdmin: await prisma.user.create({
      data: { healthId: "LUTH-ADM-0001", name: "Admin User", email: "virtualvoyager012@gmail.com", passwordHash: await hash("LUTHadmin1!"), role: "ADMIN", hospitalId: luth.id, mustChangePassword: false, sessionTtlHrs: 4 }
    }),
    luthDoc: await prisma.user.create({
      data: { healthId: "LUTH-DOC-0001", name: "Dr. Adebayo", email: "virtualvoyager012+doc@gmail.com", passwordHash: await hash("LUTHdoc123!"), role: "DOCTOR", hospitalId: luth.id, mustChangePassword: false, sessionTtlHrs: 8 }
    }),
    luthNurse: await prisma.user.create({
      data: { healthId: "LUTH-NUR-0001", name: "Nurse Chioma", email: "virtualvoyager012+nurse@gmail.com", passwordHash: await hash("LUTHnurse1!"), role: "NURSE", hospitalId: luth.id, mustChangePassword: false, sessionTtlHrs: 6 }
    }),
    luthPharm: await prisma.user.create({
      data: { healthId: "LUTH-PHA-0001", name: "Pharm. Emeka", email: "virtualvoyager012+pharm@gmail.com", passwordHash: await hash("LUTHpharm1!"), role: "PHARMACIST", hospitalId: luth.id, mustChangePassword: false, sessionTtlHrs: 8 }
    }),
    luthLab: await prisma.user.create({
      data: { healthId: "LUTH-LAB-0001", name: "Lab Tech Yusuf", email: "virtualvoyager012+lab@gmail.com", passwordHash: await hash("LUTHlab123!"), role: "LAB", hospitalId: luth.id, mustChangePassword: false, sessionTtlHrs: 8 }
    }),
    rshDoc: await prisma.user.create({
      data: { healthId: "RSH-DOC-0001", name: "Dr. Obi", email: "virtualvoyager012+rshdoc@gmail.com", passwordHash: await hash("RSHdoc1234!"), role: "DOCTOR", hospitalId: rsh.id, mustChangePassword: false, sessionTtlHrs: 8 }
    }),
  };

  // 4. Create Patients
  console.log("🛏️ Creating patients...");
  const patients = {
    adaeze: await prisma.patient.create({
      data: { patientCode: "LUTH-PT-10001", name: "Adaeze Okafor", dob: new Date("1985-04-12"), allergies: ["Penicillin", "Peanuts"], hospitalId: luth.id }
    }),
    chinedu: await prisma.patient.create({
      data: { patientCode: "LUTH-PT-10002", name: "Chinedu Eze", dob: new Date("1992-08-23"), allergies: ["Sulfa drugs"], hospitalId: luth.id }
    }),
    ngozi: await prisma.patient.create({
      data: { patientCode: "LUTH-PT-10003", name: "Ngozi Bello", dob: new Date("1978-11-05"), allergies: ["Latex"], hospitalId: luth.id }
    }),
    emeka: await prisma.patient.create({
      data: { patientCode: "LUTH-PT-10004", name: "Emeka Nnaji", dob: new Date("1965-02-14"), allergies: ["Ibuprofen"], hospitalId: luth.id }
    }),
    fatima: await prisma.patient.create({
      data: { patientCode: "LUTH-PT-10005", name: "Fatima Yusuf", dob: new Date("2001-09-30"), allergies: ["Codeine"], hospitalId: luth.id }
    }),
  };

  // 5. Create Records (with tamper-evident hashing)
  console.log("📝 Creating clinical records...");
  const noteContent = "Patient presents with persistent cough and mild fever. Prescribed Amoxicillin. Follow up in 3 days.";
  const labContent = "CBC results normal. WBC count slightly elevated.";
  const rxContent = "Amoxicillin 500mg, 1 capsule 3x daily for 7 days.";
  const traumaNote = "Emergency admission following road traffic accident. Multiple contusions.";
  const uploadContent = "X-Ray image of left tibia uploaded.";

  await prisma.record.createMany({
    data: [
      { patientId: patients.adaeze.id, authorId: users.luthDoc.id, type: "NOTE", content: noteContent, contentHash: sha256(noteContent) },
      { patientId: patients.adaeze.id, authorId: users.luthLab.id, type: "LAB", content: labContent, contentHash: sha256(labContent) },
      { patientId: patients.adaeze.id, authorId: users.luthPharm.id, type: "PRESCRIPTION", content: rxContent, contentHash: sha256(rxContent) },
      { patientId: patients.fatima.id, authorId: users.luthDoc.id, type: "NOTE", content: traumaNote, contentHash: sha256(traumaNote) },
      { patientId: patients.fatima.id, authorId: users.luthNurse.id, type: "UPLOAD", content: uploadContent, contentHash: sha256(uploadContent) },
    ]
  });

  // Helper for dates
  const now = Date.now();
  const H8 = 8 * 3600_000;
  const H48 = 48 * 3600_000;

  // 6. Create Passports & Requests
  console.log("🛂 Creating passports and requests...");

  // Adaeze: Active care team (Doc + Nurse)
  await prisma.accessPassport.createMany({
    data: [
      { userId: users.luthDoc.id, patientId: patients.adaeze.id, type: "STANDARD", status: "ACTIVE", purpose: "Primary Care", scope: ["NOTE", "LAB", "PRESCRIPTION", "UPLOAD"], expiresAt: new Date(now + H8), grantedById: users.luthAdmin.id },
      { userId: users.luthNurse.id, patientId: patients.adaeze.id, type: "STANDARD", status: "ACTIVE", purpose: "Nursing Care", scope: ["NOTE", "LAB", "PRESCRIPTION", "UPLOAD"], expiresAt: new Date(now + H8), grantedById: users.luthAdmin.id },
    ]
  });

  // Chinedu: No passport, but Doc has a PENDING request
  await prisma.passportRequest.create({
    data: {
      requesterId: users.luthDoc.id,
      patientId: patients.chinedu.id,
      purpose: "Second opinion on cardiology report",
      scope: ["NOTE", "LAB"],
      status: "PENDING",
    }
  });

  // Ngozi: EXPIRED passport for Doc (status ACTIVE, but expiresAt in the past)
  await prisma.accessPassport.create({
    data: {
      userId: users.luthDoc.id, patientId: patients.ngozi.id, type: "STANDARD", status: "ACTIVE",
      purpose: "Post-op follow up", scope: ["NOTE"], expiresAt: new Date(now - 3600_000), grantedById: users.luthAdmin.id
    }
  });

  // Emeka: REVOKED passport for Doc
  await prisma.accessPassport.create({
    data: {
      userId: users.luthDoc.id, patientId: patients.emeka.id, type: "STANDARD", status: "REVOKED",
      purpose: "Routine check", scope: ["NOTE"], expiresAt: new Date(now + H8), grantedById: users.luthAdmin.id,
      revokedById: users.luthAdmin.id, revokedAt: new Date(now - 1800_000), revokeReason: "Patient transferred to another facility"
    }
  });

  // Fatima: BREAK_GLASS for Nurse (flagged, unreviewed)
  await prisma.accessPassport.create({
    data: {
      userId: users.luthNurse.id, patientId: patients.fatima.id, type: "BREAK_GLASS", status: "ACTIVE",
      purpose: "Emergency: TRAUMA", scope: ["NOTE", "LAB", "PRESCRIPTION", "UPLOAD"],
      expiresAt: new Date(now + (2 * 3600_000)), // 2 hours
      reasonCategory: "TRAUMA", reasonDetail: "Patient unconscious following RTA, need immediate allergy and medication history.",
      flagged: true, reviewed: false
    }
  });

  // RSH Referral setup: LUTH Admin grants RSH Doc a referral for Adaeze
  await prisma.accessPassport.create({
    data: {
      userId: users.rshDoc.id, patientId: patients.adaeze.id, type: "REFERRAL", status: "ACTIVE",
      purpose: "Specialist Cardiology Consultation", scope: ["NOTE", "LAB"],
      expiresAt: new Date(now + H48), grantedById: users.luthAdmin.id
    }
  });

  // 7. Seed initial Audit Log (maintains the tamper-evident hash chain)
  console.log("📜 Seeding initial audit logs...");
  await writeAuditLog({
    userId: users.luthAdmin.id,
    action: "SEED_DATA_LOADED",
    outcome: "ALLOWED",
    reason: "Initial demo data seeded successfully."
  });

  // 8. Print Credentials
  console.log("\n✅ SEEDING COMPLETE! Here are your demo credentials:\n");
  console.log("=== LAGOS UNIVERSITY TEACHING HOSPITAL (LUTH) ===");
  console.log("Admin:      LUTH-ADM-0001 / LUTHadmin1!");
  console.log("Doctor:     LUTH-DOC-0001 / LUTHdoc123!");
  console.log("Nurse:      LUTH-NUR-0001 / LUTHnurse1!");
  console.log("Pharmacist: LUTH-PHA-0001 / LUTHpharm1!");
  console.log("Lab Tech:   LUTH-LAB-0001 / LUTHlab123!");
  console.log("\n=== RIVERS STATE HOSPITAL (RSH) ===");
  console.log("Doctor:     RSH-DOC-0001 / RSHdoc1234!");
  console.log("\n💡 Demo Scenarios:");
  console.log("   1. Adaeze Okafor  -> Active passport for Doc/Nurse. Referral active for RSH Doc.");
  console.log("   2. Chinedu Eze    -> No passport. Doc has a PENDING request in Admin queue.");
  console.log("   3. Ngozi Bello    -> EXPIRED passport for LUTH Doc.");
  console.log("   4. Emeka Nnaji    -> REVOKED passport for LUTH Doc.");
  console.log("   5. Fatima Yusuf   -> Active Break-Glass for LUTH Nurse (Flagged for Admin review).");
  console.log("\n💡 All OTP emails will be sent to your main inbox: virtualvoyager012@gmail.com");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });