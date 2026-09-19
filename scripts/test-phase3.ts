import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { issueLoginCode } from "../lib/otp";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const COOKIE = "authmedix.session-token";
const BCRYPT_ROUNDS = 12;

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.error(`  FAIL  ${name}`); }
}

function getCookie(res: Response, name: string): string | undefined {
  const cookies = res.headers.getSetCookie?.() ?? [];
  let lastValue: string | undefined;
  // Iterate all and keep the last match (handles NextAuth middleware + route handler both setting cookies)
  for (const c of cookies) {
    const [pair] = c.split(";");
    const [k, ...rest] = pair.split("=");
    if (k.trim() === name) lastValue = rest.join("=");
  }
  return lastValue;
}

async function makeUser(healthId: string, email: string, password: string, mustChange = true) {
  const hospital = await prisma.hospital.upsert({
    where: { code: "TEST" },
    update: {},
    create: { code: "TEST", name: "Phase 3 Test Hospital" },
  });
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  return prisma.user.upsert({
    where: { healthId },
    update: { passwordHash, mustChangePassword: mustChange, failedLoginAttempts: 0, status: "ACTIVE" },
    create: {
      healthId, email, name: "Test User", passwordHash, role: "DOCTOR",
      mustChangePassword: mustChange, hospitalId: hospital.id, sessionTtlHrs: 8,
    },
  });
}

async function post(path: string, body: unknown, cookie?: string) {
  return fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: `${COOKIE}=${cookie}` } : {}) },
    body: JSON.stringify(body),
  });
}

async function main() {
  console.log(`Phase 3 HTTP tests against ${BASE} — make sure \`pnpm dev\` is running.\n`);

  const MAIN_PW = "Init!alPass1";
  const docMain = await makeUser("TEST-DOC-0001", "p3-main@test.local", MAIN_PW, true);
  const docLock = await makeUser("TEST-DOC-0002", "p3-lock@test.local", "Lock!MeNow1", true);
  const docOtp = await makeUser("TEST-DOC-0003", "p3-otp@test.local", "Otp!Guard1", true);

  console.log("--- Step 1: login ---");
  let res = await post("/api/auth/login", { healthId: "TEST-DOC-0001", email: "p3-main@test.local", password: MAIN_PW });
  check("valid login returns codeSent", res.status === 200 && (await res.json()).codeSent === true);

  res = await post("/api/auth/login", { healthId: "TEST-DOC-0001", email: "p3-main@test.local", password: "Wrong!Pass1" });
  check("wrong password returns 401 invalid_credentials", res.status === 401 && (await res.json()).error === "invalid_credentials");

  res = await post("/api/auth/login", { healthId: "TEST-DOC-0001", email: "wrong@test.local", password: MAIN_PW });
  check("healthId+email mismatch returns 401", res.status === 401);

  console.log("--- Password lockout (5 failures) ---");
  for (let i = 0; i < 5; i++) {
    await post("/api/auth/login", { healthId: "TEST-DOC-0002", email: "p3-lock@test.local", password: "Nope!12345" });
  }
  res = await post("/api/auth/login", { healthId: "TEST-DOC-0002", email: "p3-lock@test.local", password: "Lock!MeNow1" });
  const lockBody = await res.json();
  check("account locked after 5 failures", res.status === 403 && lockBody.locked === true);

  console.log("--- Step 2: verify-code + session issuance ---");
  const knownCode = await issueLoginCode(docMain.id);
  res = await post("/api/auth/verify-code", { healthId: "TEST-DOC-0001", code: knownCode });
  const sessionCookie = getCookie(res, COOKIE);
  const vcBody = await res.json();
  check("verify-code succeeds", res.status === 200 && vcBody.ok === true);
  check("mustChangePassword surfaced", vcBody.mustChangePassword === true);
  check("session cookie issued", !!sessionCookie);

  console.log("--- Session readable by NextAuth (/api/auth/session) ---");
  res = await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: `${COOKIE}=${sessionCookie}` } });
  const sess = await res.json();
  check("session.user.role = DOCTOR", sess?.user?.role === "DOCTOR");
  check("session.user.healthId matches", sess?.user?.healthId === "TEST-DOC-0001");
  check("session.mustChangePassword true", sess?.user?.mustChangePassword === true);
  check("session.sessionExpiresAt present", typeof sess?.user?.sessionExpiresAt === "string");

  console.log("--- mustChangePassword gate ---");
  res = await fetch(`${BASE}/api/patients?query=a`, { headers: { Cookie: `${COOKIE}=${sessionCookie}` } });
  check("protected route blocked while mustChangePassword", res.status === 403);

    console.log("--- Step 3: forced set-password ---");
  const NEW_PW = "Brand!NewPass2";
  res = await post("/api/auth/set-password", { newPassword: NEW_PW }, sessionCookie);
  const spBody = await res.json();
  const newCookie = getCookie(res, COOKIE);
  check("forced set-password succeeds", res.status === 200 && spBody.ok === true);
  const dbUser = await prisma.user.findUnique({ where: { id: docMain.id } });
  check("mustChangePassword now false", dbUser?.mustChangePassword === false);
  check("new password verifies via bcrypt", await bcrypt.compare(NEW_PW, dbUser!.passwordHash));

  // DEBUG LOGS
  console.log("DEBUG newCookie present?", !!newCookie);
  res = await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: `${COOKIE}=${newCookie}` } });
  const sess2 = await res.json();
  console.log("DEBUG sess2:", JSON.stringify(sess2, null, 2));
  check("re-issued session has mustChangePassword=false", sess2?.user?.mustChangePassword === false);

  console.log("--- Voluntary set-password ---");
  res = await post("/api/auth/set-password", { currentPassword: NEW_PW, newPassword: "Volun!taryPass3" }, newCookie);
  check("voluntary change with correct current pw succeeds", res.status === 200);
  res = await post("/api/auth/set-password", { currentPassword: "Wrong!Current1", newPassword: "Another!Pass4x" }, newCookie);
  check("voluntary change with wrong current pw rejected", res.status === 401);

  console.log("--- Lockout-DoS guard (no code issued) ---");
  let lockedEarly = false;
  for (let i = 0; i < 5; i++) {
    res = await post("/api/auth/verify-code", { healthId: "TEST-DOC-0003", code: "999999" });
    const b = await res.json().catch(() => ({}));
    if (b.locked) lockedEarly = true;
  }
  check("wrong-code guesses with no issued code do NOT lock account", !lockedEarly);

  // Cleanup
  await prisma.loginCode.deleteMany({ where: { userId: { in: [docMain.id, docLock.id, docOtp.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [docMain.id, docLock.id, docOtp.id] } } });
  await prisma.$disconnect();

  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });