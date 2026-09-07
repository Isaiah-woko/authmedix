import "dotenv/config";
import { prisma } from "../lib/prisma";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";

async function main() {
  console.log("🚀 Testing System Bootstrap...\n");

  // 1. Wipe the database to simulate a fresh install
  console.log("🧹 Wiping database to simulate fresh install...");
  await prisma.auditLog.deleteMany({});
  await prisma.loginCode.deleteMany({});
  await prisma.record.deleteMany({});
  await prisma.passportRequest.deleteMany({});
  await prisma.accessPassport.deleteMany({});
  await prisma.patient.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.hospital.deleteMany({});

  // 2. Call the bootstrap route
  console.log("📡 Calling POST /api/bootstrap...");
  let res = await fetch(`${BASE}/api/bootstrap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      hospitalName: "National Cyber Security Hospital",
      hospitalCode: "NCSH",
      adminName: "Chief Security Officer",
      adminEmail: "cso@ncsh.gov",
      adminPassword: "SuperSecure!nitda2026"
    }),
  });

  if (res.status === 201) {
    const data = await res.json();
    console.log(`✅ SUCCESS: First Admin created with Health ID: ${data.healthId}`);
  } else {
    console.error("❌ FAILED: Bootstrap should have succeeded on an empty DB.");
    console.error(await res.text());
    process.exit(1);
  }

  // 3. Try to call it AGAIN (The Kill Switch Test)
  console.log("\n🛡️ Testing the Kill Switch (calling bootstrap a second time)...");
  res = await fetch(`${BASE}/api/bootstrap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      hospitalName: "Hacker Hospital",
      hospitalCode: "HACK",
      adminName: "Evil Admin",
      adminEmail: "evil@hack.com",
      adminPassword: "AnotherSecure!Pass1"
    }),
  });

  if (res.status === 403) {
    const data = await res.json();
    console.log(`✅ SUCCESS: Second attempt blocked! Reason: ${data.error}`);
  } else {
    console.error("❌ CRITICAL SECURITY FLAW: Bootstrap route was not disabled after first use!");
    process.exit(1);
  }

  // 4. Verify the Audit Log caught the system event
  const logs = await prisma.auditLog.findMany({ where: { action: "SYSTEM_BOOTSTRAP" } });
  if (logs.length === 1 && logs[0].userId === null) {
    console.log("✅ SUCCESS: System bootstrap event logged in audit trail (userId: null).");
  } else {
    console.error("❌ FAILED: Audit log missing or incorrect for bootstrap event.");
    process.exit(1);
  }

  console.log("\n🎉 Bootstrap flow is secure and working perfectly!");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});