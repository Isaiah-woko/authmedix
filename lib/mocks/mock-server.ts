// DEV-ONLY fake backend. Active only when NEXT_PUBLIC_USE_MOCKS=1.
import type { UserStatus, UserRole } from "@/types/auth";
import type { Session, SessionUser } from "@/types/session";
import { SESSION_TTL_HOURS } from "@/types/session";
import type { PatientIdentity } from "@/types/patient";
import type { RecordType } from "@/types/record";

export class MockApiError extends Error {
  status: number;
  reason?: string;
  locked?: boolean;
  patient?: PatientIdentity;
  constructor(message: string, status: number, reason?: string, locked?: boolean) {
    super(message);
    this.name = "MockApiError";
    this.status = status;
    this.reason = reason;
    this.locked = locked;
  }
}

interface MockUser {
  id: string; healthId: string; email: string; password: string; name: string;
  role: UserRole; hospitalId: string; mustChangePassword: boolean;
  status: UserStatus; failedLogins: number; locked: boolean;
}

const users: MockUser[] = [
  { id: "u-doctor", healthId: "LUTH-DOC-0231", email: "doctor@meditrust.dev", password: "Passw0rd!Doc", name: "Dr. Amina Bello", role: "DOCTOR", hospitalId: "LUTH", mustChangePassword: true, status: "ACTIVE", failedLogins: 0, locked: false },
  { id: "u-nurse", healthId: "LUTH-NUR-0112", email: "nurse@meditrust.dev", password: "Passw0rd!Nur", name: "Musa Okafor, RN", role: "NURSE", hospitalId: "LUTH", mustChangePassword: false, status: "ACTIVE", failedLogins: 0, locked: false },
  { id: "u-pharmacist", healthId: "LUTH-PHA-0045", email: "pharmacist@meditrust.dev", password: "Passw0rd!Pha", name: "Grace Adeyemi", role: "PHARMACIST", hospitalId: "LUTH", mustChangePassword: false, status: "ACTIVE", failedLogins: 0, locked: false },
  { id: "u-lab", healthId: "LUTH-LAB-0091", email: "lab@meditrust.dev", password: "Passw0rd!Lab", name: "Blessing Okoro", role: "LAB", hospitalId: "LUTH", mustChangePassword: false, status: "ACTIVE", failedLogins: 0, locked: false },
  { id: "u-admin", healthId: "LUTH-ADM-0007", email: "admin@meditrust.dev", password: "Passw0rd!Adm", name: "Chidi Balogun", role: "ADMIN", hospitalId: "LUTH", mustChangePassword: false, status: "ACTIVE", failedLogins: 0, locked: false },
];

export const MOCK_DEMO_CODE = "123456";
export const MOCK_DEMO_USERS = users.map((u) => ({ healthId: u.healthId, email: u.email, password: u.password, note: u.mustChangePassword ? "forced password change" : "clean login" }));

interface MockPatient { id: string; name: string; patientCode: string; dob: string; allergies: string[]; }

const patients: MockPatient[] = [
  { id: "pt-1", name: "Marcus Osei", patientCode: "PT-00291-A", dob: "1978-03-14", allergies: ["Penicillin"] },
  { id: "pt-2", name: "Yuki Tanaka", patientCode: "PT-00814-F", dob: "1990-11-02", allergies: ["Peanuts"] },
  { id: "pt-3", name: "Amara Diallo", patientCode: "PT-01093-B", dob: "1985-06-21", allergies: ["Latex"] },
  { id: "pt-4", name: "Ibrahim Musa", patientCode: "PT-01102-C", dob: "1969-01-30", allergies: ["Sulfa drugs"] },
  { id: "pt-5", name: "Fatima Bello", patientCode: "PT-01150-D", dob: "1994-09-17", allergies: ["Aspirin"] },
  { id: "pt-6", name: "Chinedu Eze", patientCode: "PT-01177-E", dob: "1982-12-05", allergies: ["Shellfish"] },
  { id: "pt-7", name: "Kemi Adeleke", patientCode: "PT-01200-G", dob: "1992-04-10", allergies: ["Ibuprofen"] }, // New patient for Phase 6 testing
];

interface MockRecord { id: string; patientId: string; type: RecordType; content: string; createdAt: string; authorName: string; authorRole: UserRole; }
const hoursFromNow = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

const records: MockRecord[] = [
  { id: "rec-1", patientId: "pt-1", type: "NOTE", content: "Admission note: 52-year-old male with persistent cough and low-grade fever for six days. Chest examination reveals crackles at the right base. Started on empirical antibiotics pending cultures.", createdAt: hoursFromNow(-30), authorName: "Dr. Amina Bello", authorRole: "DOCTOR" },
  { id: "rec-2", patientId: "pt-1", type: "LAB", content: "Full blood count: WBC 14.2 (raised), CRP 48 (raised). Urea and electrolytes within normal limits. Blood cultures pending at 48 hours.", createdAt: hoursFromNow(-26), authorName: "Blessing Okoro", authorRole: "LAB" },
  { id: "rec-3", patientId: "pt-1", type: "PRESCRIPTION", content: "Co-amoxiclav 625mg three times daily for 7 days. Paracetamol 1g four times daily as needed. Note penicillin allergy on file: confirm cross-sensitivity before first dose.", createdAt: hoursFromNow(-25), authorName: "Dr. Amina Bello", authorRole: "DOCTOR" },
  { id: "rec-4", patientId: "pt-1", type: "UPLOAD", content: "Chest X-ray report: right lower zone consolidation consistent with community-acquired pneumonia. No effusion. Recommend follow-up film in six weeks.", createdAt: hoursFromNow(-24), authorName: "Radiology Unit", authorRole: "LAB" },
  { id: "rec-5", patientId: "pt-2", type: "NOTE", content: "Referral note: transferred from Rivers State Hospital for specialist cardiac review. Known peanut allergy with prior anaphylaxis, carries two adrenaline auto-injectors.", createdAt: hoursFromNow(-40), authorName: "Dr. Amina Bello", authorRole: "DOCTOR" },
  { id: "rec-6", patientId: "pt-2", type: "LAB", content: "Echocardiogram summary: mild mitral regurgitation, preserved ejection fraction at 60 percent. Troponin negative on two samples.", createdAt: hoursFromNow(-36), authorName: "Blessing Okoro", authorRole: "LAB" },
  { id: "rec-7", patientId: "pt-3", type: "NOTE", content: "Emergency department note: brought in unconscious after collapse at home. Glasgow Coma Scale 9 on arrival. Airway protected, awaiting toxicology screen.", createdAt: hoursFromNow(-2), authorName: "Dr. Amina Bello", authorRole: "DOCTOR" },
  { id: "rec-8", patientId: "pt-3", type: "LAB", content: "Urgent toxicology: paracetamol level above treatment line at four hours post-ingestion. Liver function tests deranged. Start acetylcysteine protocol.", createdAt: hoursFromNow(-1.5), authorName: "Blessing Okoro", authorRole: "LAB" },
  { id: "rec-9", patientId: "pt-3", type: "PRESCRIPTION", content: "Current medications on admission: metformin 500mg twice daily, latanoprost eye drops nightly. Hold metformin pending renal function.", createdAt: hoursFromNow(-1.8), authorName: "Grace Adeyemi", authorRole: "PHARMACIST" },
  { id: "rec-10", patientId: "pt-3", type: "UPLOAD", content: "CT head report: no acute intracranial abnormality. Clinical correlation advised regarding suspected ingestion.", createdAt: hoursFromNow(-1.2), authorName: "Radiology Unit", authorRole: "LAB" },
  { id: "rec-11", patientId: "pt-4", type: "NOTE", content: "Outpatient note: hypertensive review, blood pressure 150/92. Adherent to amlodipine. Repeat in three months.", createdAt: hoursFromNow(-72), authorName: "Dr. Amina Bello", authorRole: "DOCTOR" },
  { id: "rec-12", patientId: "pt-5", type: "NOTE", content: "Discharge summary from prior episode: uncomplicated urinary tract infection, treated for five days, resolved.", createdAt: hoursFromNow(-96), authorName: "Dr. Amina Bello", authorRole: "DOCTOR" },
];

interface MockPassport {
  id: string; type: "STANDARD" | "REFERRAL" | "BREAK_GLASS"; status: "ACTIVE" | "EXPIRED" | "REVOKED";
  userId: string; patientId: string; purpose: string; scope: string; duration: "8H" | "24H" | "48H" | "2H";
  expiresAt: string; createdAt: string; grantedById: string | null; renewalCount: number; flagged: boolean;
  reviewed?: boolean; reasonCategory?: string; reasonDetail?: string;
}

const passports: MockPassport[] = [
  { id: "pas-1", type: "STANDARD", status: "ACTIVE", userId: "LUTH-DOC-0231", patientId: "pt-1", purpose: "Clinical consultation and treatment", scope: "Notes, Labs, Prescriptions, Uploads, Allergies", duration: "8H", expiresAt: hoursFromNow(2.23), createdAt: hoursFromNow(-5.77), grantedById: "LUTH-ADM-0007", renewalCount: 0, flagged: false },
  { id: "pas-2", type: "REFERRAL", status: "ACTIVE", userId: "LUTH-DOC-0231", patientId: "pt-2", purpose: "Inter-hospital referral", scope: "Notes, Labs, Prescriptions, Uploads, Allergies", duration: "48H", expiresAt: hoursFromNow(0.47), createdAt: hoursFromNow(-47.5), grantedById: "LUTH-ADM-0007", renewalCount: 0, flagged: false },
  { id: "pas-3", type: "BREAK_GLASS", status: "ACTIVE", userId: "LUTH-DOC-0231", patientId: "pt-3", purpose: "Emergency access", scope: "Emergency Summary", duration: "2H", expiresAt: hoursFromNow(0.68), createdAt: hoursFromNow(-1.32), grantedById: null, renewalCount: 0, flagged: true, reviewed: false, reasonCategory: "UNCONSCIOUS_UNRESPONSIVE", reasonDetail: "Patient unconscious following suspected poisoning. Immediate access to medication and allergy history required." },
  { id: "pas-4", type: "STANDARD", status: "EXPIRED", userId: "LUTH-DOC-0231", patientId: "pt-5", purpose: "Prior episode of care", scope: "Notes, Labs", duration: "8H", expiresAt: hoursFromNow(-3), createdAt: hoursFromNow(-11), grantedById: "LUTH-ADM-0007", renewalCount: 1, flagged: false },
  { id: "pas-5", type: "STANDARD", status: "REVOKED", userId: "LUTH-DOC-0231", patientId: "pt-6", purpose: "Ward cover", scope: "Notes", duration: "8H", expiresAt: hoursFromNow(5), createdAt: hoursFromNow(-2), grantedById: "LUTH-ADM-0007", renewalCount: 0, flagged: false },
  { id: "pas-6", type: "STANDARD", status: "ACTIVE", userId: "LUTH-NUR-0112", patientId: "pt-1", purpose: "Patient care and monitoring", scope: "Notes, Labs, Uploads, Allergies", duration: "8H", expiresAt: hoursFromNow(4), createdAt: hoursFromNow(-4), grantedById: "LUTH-ADM-0007", renewalCount: 0, flagged: false },
  { id: "pas-7", type: "STANDARD", status: "ACTIVE", userId: "LUTH-LAB-0091", patientId: "pt-1", purpose: "Laboratory investigation", scope: "Labs", duration: "8H", expiresAt: hoursFromNow(6), createdAt: hoursFromNow(-2), grantedById: "LUTH-ADM-0007", renewalCount: 0, flagged: false },
  { id: "pas-8", type: "STANDARD", status: "ACTIVE", userId: "LUTH-PHA-0045", patientId: "pt-6", purpose: "Medication review and dispensing", scope: "Prescriptions, Allergies", duration: "8H", expiresAt: hoursFromNow(5), createdAt: hoursFromNow(-3), grantedById: "LUTH-ADM-0007", renewalCount: 0, flagged: false },
];

const passportRequests = [
  { id: "req-1", userId: "LUTH-DOC-0231", patientId: "pt-4", purpose: "Clinical consultation and treatment", scope: "Notes, Labs, Prescriptions, Uploads, Allergies", status: "PENDING" as const, createdAt: hoursFromNow(-1) },
];

const ROLE_RECORD_VISIBILITY: Record<UserRole, RecordType[]> = {
  DOCTOR: ["NOTE", "LAB", "PRESCRIPTION", "UPLOAD"],
  NURSE: ["NOTE", "LAB", "PRESCRIPTION", "UPLOAD"],
  PHARMACIST: ["NOTE", "LAB", "PRESCRIPTION", "UPLOAD"],
  LAB: ["LAB"],
  ADMIN: [],
};
const ALLERGY_VISIBLE_ROLES: UserRole[] = ["DOCTOR", "NURSE", "PHARMACIST"];
const ALL_RECORD_TYPES: RecordType[] = ["NOTE", "LAB", "PRESCRIPTION", "UPLOAD"];

const CODE_TTL_MS = 5 * 60 * 1000;
const MAX_LOGIN_FAILS = 5;
const MAX_CODE_FAILS = 3;

const KEY_PENDING = "meditrust.mock.pendingHealthId";
const KEY_ACTIVE = "meditrust.mock.activeHealthId";
const KEY_CODE_EXPIRY = "meditrust.mock.codeExpiresAt";
const KEY_CODE_FAILS = "meditrust.mock.codeFails";
const KEY_SESSION = "meditrust.mock.session";

function flowGet(key: string): string | null { if (typeof window === "undefined") return null; return window.sessionStorage.getItem(key); }
function flowSet(key: string, value: string | null): void { if (typeof window === "undefined") return; if (value === null) window.sessionStorage.removeItem(key); else window.sessionStorage.setItem(key, value); }
function currentHealthId(): string | null { const raw = flowGet(KEY_SESSION); if (!raw) return null; try { return (JSON.parse(raw) as Session).user.healthId; } catch { return null; } }
function roleOf(healthId: string): UserRole | null { return users.find((u) => u.healthId === healthId)?.role ?? null; }
const delay = (ms = 350) => new Promise((r) => setTimeout(r, ms));

function sessionFor(user: MockUser): Session {
  const ttlHours = SESSION_TTL_HOURS[user.role];
  const userSnap: SessionUser = { id: user.id, healthId: user.healthId, name: user.name, email: user.email, role: user.role, hospitalId: user.hospitalId, mustChangePassword: user.mustChangePassword, status: user.status };
  return { user: userSnap, sessionExpiresAt: new Date(Date.now() + ttlHours * 3_600_000).toISOString() };
}

function withJoins(p: MockPassport) {
  const patient = patients.find((x) => x.id === p.patientId);
  const user = users.find((u) => u.healthId === p.userId);
  return { ...p, patientName: patient?.name, patientCode: patient?.patientCode, userName: user?.name, userHealthId: user?.healthId };
}

function withRequestJoins(r: (typeof passportRequests)[number]) {
  const patient = patients.find((x) => x.id === r.patientId);
  const user = users.find((u) => u.healthId === r.userId);
  return { ...r, userName: user?.name, userHealthId: user?.healthId, patientName: patient?.name, patientCode: patient?.patientCode };
}

function flaggedEntries() {
  return passports.filter((p) => p.flagged && !p.reviewed).map((p) => {
    const patient = patients.find((x) => x.id === p.patientId);
    const user = users.find((u) => u.healthId === p.userId);
    return { id: p.id, userId: p.userId, userName: user?.name, patientId: p.patientId, patientName: patient?.name, action: "BREAK_GLASS" as const, outcome: "FLAGGED" as const, flagged: true, reviewed: false, timestamp: p.createdAt, reasonCategory: p.reasonCategory, reasonDetail: p.reasonDetail };
  });
}

function isActive(p: MockPassport): boolean { return p.status === "ACTIVE" && new Date(p.expiresAt).getTime() > Date.now(); }
function identityOf(p: MockPatient): PatientIdentity { return { id: p.id, name: p.name, patientCode: p.patientCode }; }

export async function mockRequest<T>(endpoint: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  await delay();
  const method = options.method ?? "GET";
  const body = (options.body ?? {}) as Record<string, unknown>;
  const [path, query = ""] = endpoint.split("?");
  const params = new URLSearchParams(query);
  const me = currentHealthId();

  if (method === "POST" && path === "/auth/login") {
    const { healthId, email, password } = body as { healthId: string; email: string; password: string };
    const user = users.find((u) => u.healthId === healthId && u.email === email);
    if (!user || user.password !== password) {
      if (user) { user.failedLogins += 1; if (user.failedLogins >= MAX_LOGIN_FAILS) { user.locked = true; throw new MockApiError("Account locked after repeated failed attempts. Contact your administrator.", 423, undefined, true); } }
      throw new MockApiError("Invalid credentials. Check your Health ID, email and password.", 401);
    }
    if (user.locked || user.status === "SUSPENDED") throw new MockApiError("This account is locked or suspended. Contact your administrator.", 423, undefined, true);
    user.failedLogins = 0; flowSet(KEY_PENDING, user.healthId); flowSet(KEY_CODE_FAILS, "0");
    const expiresAt = Date.now() + CODE_TTL_MS; flowSet(KEY_CODE_EXPIRY, String(expiresAt));
    return { success: true, codeExpiresAt: new Date(expiresAt).toISOString() } as T;
  }

  if (method === "POST" && path === "/auth/verify-code") {
    const { code } = body as { code: string };
    const user = users.find((u) => u.healthId === flowGet(KEY_PENDING));
    if (!user) throw new MockApiError("No login in progress. Start again.", 400);
    const expiry = Number(flowGet(KEY_CODE_EXPIRY) ?? "0");
    if (Date.now() > expiry) throw new MockApiError("Code expired. Send a new one.", 400, "CODE_EXPIRED");
    if (code !== MOCK_DEMO_CODE) {
      const fails = Number(flowGet(KEY_CODE_FAILS) ?? "0") + 1; flowSet(KEY_CODE_FAILS, String(fails));
      if (fails >= MAX_CODE_FAILS) { user.locked = true; throw new MockApiError("Account locked after repeated wrong codes. Contact your administrator.", 423, undefined, true); }
      throw new MockApiError(`Wrong code. ${MAX_CODE_FAILS - fails} attempt(s) left.`, 401);
    }
    flowSet(KEY_PENDING, null); flowSet(KEY_CODE_EXPIRY, null); flowSet(KEY_ACTIVE, user.healthId);
    return { success: true, session: sessionFor(user) } as T;
  }

  if (method === "POST" && path === "/auth/resend-code") {
    const user = users.find((u) => u.healthId === flowGet(KEY_PENDING));
    if (!user) throw new MockApiError("No login in progress. Start again.", 400);
    const expiresAt = Date.now() + CODE_TTL_MS; flowSet(KEY_CODE_EXPIRY, String(expiresAt)); flowSet(KEY_CODE_FAILS, "0");
    return { success: true, codeExpiresAt: new Date(expiresAt).toISOString() } as T;
  }

  if (method === "POST" && path === "/auth/set-password") {
    const { newPassword } = body as { newPassword: string };
    const user = users.find((u) => u.healthId === flowGet(KEY_ACTIVE));
    if (!user) throw new MockApiError("No verified session. Verify a code first.", 400);
    if (typeof newPassword !== "string" || newPassword.length < 10) throw new MockApiError("Password does not meet strength requirements.", 400);
    user.mustChangePassword = false; user.password = newPassword; flowSet(KEY_ACTIVE, null);
    return { success: true } as T;
  }

  if (method === "GET" && path === "/patients") {
    if (!me) throw new MockApiError("Session expired. Please sign in again.", 401);
    const q = (params.get("query") ?? "").trim().toLowerCase();
    return patients.filter((p) => p.name.toLowerCase().includes(q) || p.patientCode.toLowerCase().includes(q)).map(identityOf) as T;
  }

  if (method === "GET" && path.startsWith("/patients/")) {
    if (!me) throw new MockApiError("Session expired. Please sign in again.", 401);
    const id = path.split("/")[2];
    const patient = patients.find((p) => p.id === id);
    if (!patient) throw new MockApiError("Patient not found.", 404);
    const mine = passports.filter((p) => p.patientId === id && p.userId === me);
    const active = mine.find(isActive);
    if (!active) {
      const revoked = mine.find((p) => p.status === "REVOKED");
      const expired = mine.find((p) => p.status === "EXPIRED" || (p.status === "ACTIVE" && !isActive(p)));
      const reason = revoked ? "PASSPORT_REVOKED" : expired ? "PASSPORT_EXPIRED" : "NO_PASSPORT";
      const error = new MockApiError("Access denied.", 403, reason);
      error.patient = identityOf(patient);
      throw error;
    }
    const role = roleOf(me) ?? "ADMIN";
    const isBreakGlass = active.type === "BREAK_GLASS";
    const visibleTypes = isBreakGlass ? ALL_RECORD_TYPES : ROLE_RECORD_VISIBILITY[role];
    const patientRecords = records.filter((r) => r.patientId === id && visibleTypes.includes(r.type)).map((r) => ({ ...r }));
    const showAllergies = isBreakGlass || ALLERGY_VISIBLE_ROLES.includes(role);
    return { patient: { ...identityOf(patient), dob: patient.dob, allergies: showAllergies ? patient.allergies : undefined }, records: patientRecords, passport: withJoins(active) } as T;
  }

  if (method === "GET" && path === "/passports/mine") {
    if (!me) throw new MockApiError("Session expired. Please sign in again.", 401);
    return passports.filter((p) => p.userId === me && isActive(p)).map(withJoins) as T;
  }

  if (method === "GET" && path === "/passports") {
    if (!me) throw new MockApiError("Session expired. Please sign in again.", 401);
    return passports.filter(isActive).map(withJoins) as T;
  }

  if (method === "POST" && /^\/passports\/[^/]+\/renew$/.test(path)) {
    if (!me) throw new MockApiError("Session expired. Please sign in again.", 401);
    const id = path.split("/")[2];
    const passport = passports.find((p) => p.id === id);
    if (!passport) throw new MockApiError("Passport not found.", 404);
    if (passport.userId !== me) throw new MockApiError("Only the passport holder can renew it.", 403);
    if (passport.type === "BREAK_GLASS") throw new MockApiError("Break-glass passports cannot be renewed. Re-invoke if the emergency continues.", 403);
    if (!isActive(passport)) throw new MockApiError("This passport is no longer active.", 403);
    const addHours = passport.duration === "48H" ? 48 : passport.duration === "24H" ? 24 : passport.duration === "2H" ? 2 : 8;
    passport.expiresAt = new Date(Date.now() + addHours * 3_600_000).toISOString();
    passport.renewalCount += 1;
    return { success: true, newExpiresAt: passport.expiresAt } as T;
  }

  if (method === "GET" && path === "/passport-requests") {
    if (!me) throw new MockApiError("Session expired. Please sign in again.", 401);
    const mine = passportRequests.filter((r) => r.userId === me).map(withRequestJoins);
    if (params.get("status") === "pending") return mine.filter((r) => r.status === "PENDING") as T;
    return mine as T;
  }

  // NEW: POST /passport-requests
  if (method === "POST" && path === "/passport-requests") {
    if (!me) throw new MockApiError("Session expired. Please sign in again.", 401);
    const { patientId, purpose, scope } = body as { patientId: string; purpose?: string; scope?: string[] };
    const patient = patients.find((p) => p.id === patientId);
    if (!patient) throw new MockApiError("Patient not found.", 404);
    const newRequest = {
      id: `req-${Date.now()}`, userId: me, patientId,
      purpose: purpose ?? "Clinical consultation",
      scope: scope ? scope.join(", ") : "Notes, Labs",
      status: "PENDING" as const, createdAt: new Date().toISOString(),
    };
    passportRequests.push(newRequest);
    return withRequestJoins(newRequest) as T;
  }

  // NEW: POST /break-glass
  if (method === "POST" && path === "/break-glass") {
    if (!me) throw new MockApiError("Session expired. Please sign in again.", 401);
    const role = roleOf(me);
    if (role === "ADMIN") throw new MockApiError("Admin cannot invoke break-glass.", 403);
    const { patientId, confirmedEmergency, reasonCategory, reasonDetail } = body as { patientId: string; confirmedEmergency: boolean; reasonCategory: string; reasonDetail: string; };
    if (!confirmedEmergency) throw new MockApiError("Emergency not confirmed.", 400);
    if (!reasonDetail || reasonDetail.length < 10) throw new MockApiError("Justification must be at least 10 characters.", 400);
    const patient = patients.find((p) => p.id === patientId);
    if (!patient) throw new MockApiError("Patient not found.", 404);
    const expiresAt = hoursFromNow(2);
    const newPassport: MockPassport = {
      id: `pas-bg-${Date.now()}`, type: "BREAK_GLASS", status: "ACTIVE", userId: me, patientId,
      purpose: "Emergency access", scope: "Emergency Summary", duration: "2H", expiresAt,
      createdAt: new Date().toISOString(), grantedById: null, renewalCount: 0, flagged: true,
      reviewed: false, reasonCategory, reasonDetail,
    };
    passports.push(newPassport);
    return { passportId: newPassport.id, expiresAt } as T;
  }

  if (method === "GET" && path === "/admin/audit") {
    if (!me) throw new MockApiError("Session expired. Please sign in again.", 401);
    return flaggedEntries() as T;
  }

  throw new MockApiError(`Mock route not implemented yet: ${method} ${endpoint}`, 404);
}