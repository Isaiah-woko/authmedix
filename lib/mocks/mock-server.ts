// DEV-ONLY fake backend. Active only when NEXT_PUBLIC_USE_MOCKS=1.
// Mirrors the real contract: same routes, same shapes, same denial rules.
// Flow state lives in sessionStorage so a page refresh mid-login still works.
// When the real API merges: set the flag to 0 and delete this folder.

import type { UserStatus, UserRole } from "@/types/auth";
import type { Session, SessionUser } from "@/types/session";
import { SESSION_TTL_HOURS } from "@/types/session";

export class MockApiError extends Error {
  status: number;
  reason?: string;
  locked?: boolean;
  constructor(message: string, status: number, reason?: string, locked?: boolean) {
    super(message);
    this.name = "MockApiError";
    this.status = status;
    this.reason = reason;
    this.locked = locked;
  }
}

interface MockUser {
  id: string;
  healthId: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  hospitalId: string;
  mustChangePassword: boolean;
  status: UserStatus;
  failedLogins: number;
  locked: boolean;
}

const users: MockUser[] = [
  {
    id: "u-doctor",
    healthId: "LUTH-DOC-0231",
    email: "doctor@meditrust.dev",
    password: "Passw0rd!Doc",
    name: "Dr. Amina Bello",
    role: "DOCTOR",
    hospitalId: "LUTH",
    mustChangePassword: true, // exercises the Set Password screen
    status: "ACTIVE",
    failedLogins: 0,
    locked: false,
  },
  {
    id: "u-nurse",
    healthId: "LUTH-NUR-0112",
    email: "nurse@meditrust.dev",
    password: "Passw0rd!Nur",
    name: "Musa Okafor, RN",
    role: "NURSE",
    hospitalId: "LUTH",
    mustChangePassword: false, // goes straight to dashboard
    status: "ACTIVE",
    failedLogins: 0,
    locked: false,
  },
];

export const MOCK_DEMO_CODE = "123456";
export const MOCK_DEMO_USERS = users.map((u) => ({
  healthId: u.healthId,
  email: u.email,
  password: u.password,
  note: u.mustChangePassword ? "forced password change" : "clean login",
}));

const CODE_TTL_MS = 5 * 60 * 1000;
const MAX_LOGIN_FAILS = 5;
const MAX_CODE_FAILS = 3;

const KEY_PENDING = "meditrust.mock.pendingHealthId";
const KEY_ACTIVE = "meditrust.mock.activeHealthId";
const KEY_CODE_EXPIRY = "meditrust.mock.codeExpiresAt";
const KEY_CODE_FAILS = "meditrust.mock.codeFails";

function flowGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(key);
}

function flowSet(key: string, value: string | null): void {
  if (typeof window === "undefined") return;
  if (value === null) window.sessionStorage.removeItem(key);
  else window.sessionStorage.setItem(key, value);
}

const delay = (ms = 350) => new Promise((r) => setTimeout(r, ms));

function sessionFor(user: MockUser): Session {
  const ttlHours = SESSION_TTL_HOURS[user.role];
  const userSnap: SessionUser = {
    id: user.id,
    healthId: user.healthId,
    name: user.name,
    email: user.email,
    role: user.role,
    hospitalId: user.hospitalId,
    mustChangePassword: user.mustChangePassword,
    status: user.status,
  };
  return {
    user: userSnap,
    sessionExpiresAt: new Date(Date.now() + ttlHours * 3_600_000).toISOString(),
  };
}

export async function mockRequest<T>(
  endpoint: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  await delay();
  const method = options.method ?? "GET";
  const body = (options.body ?? {}) as Record<string, unknown>;

  // POST /auth/login
  if (method === "POST" && endpoint === "/auth/login") {
    const { healthId, email, password } = body as {
      healthId: string;
      email: string;
      password: string;
    };
    const user = users.find((u) => u.healthId === healthId && u.email === email);
    if (!user || user.password !== password) {
      if (user) {
        user.failedLogins += 1;
        if (user.failedLogins >= MAX_LOGIN_FAILS) {
          user.locked = true;
          throw new MockApiError(
            "Account locked after repeated failed attempts. Contact your administrator.",
            423,
            undefined,
            true
          );
        }
      }
      // Generic on purpose — never reveal which field was wrong
      throw new MockApiError("Invalid credentials. Check your Health ID, email and password.", 401);
    }
    if (user.locked || user.status === "SUSPENDED") {
      throw new MockApiError(
        "This account is locked or suspended. Contact your administrator.",
        423,
        undefined,
        true
      );
    }
    user.failedLogins = 0;
    flowSet(KEY_PENDING, user.healthId);
    flowSet(KEY_CODE_FAILS, "0");
    const expiresAt = Date.now() + CODE_TTL_MS;
    flowSet(KEY_CODE_EXPIRY, String(expiresAt));
    console.info("[mock] OTP code issued:", MOCK_DEMO_CODE);
    return { success: true, codeExpiresAt: new Date(expiresAt).toISOString() } as T;
  }

  // POST /auth/verify-code
  if (method === "POST" && endpoint === "/auth/verify-code") {
    const { code } = body as { code: string };
    const user = users.find((u) => u.healthId === flowGet(KEY_PENDING));
    if (!user) throw new MockApiError("No login in progress. Start again.", 400);
    const expiry = Number(flowGet(KEY_CODE_EXPIRY) ?? "0");
    if (Date.now() > expiry) {
      throw new MockApiError("Code expired. Send a new one.", 400, "CODE_EXPIRED");
    }
    if (code !== MOCK_DEMO_CODE) {
      const fails = Number(flowGet(KEY_CODE_FAILS) ?? "0") + 1;
      flowSet(KEY_CODE_FAILS, String(fails));
      if (fails >= MAX_CODE_FAILS) {
        user.locked = true;
        throw new MockApiError(
          "Account locked after repeated wrong codes. Contact your administrator.",
          423,
          undefined,
          true
        );
      }
      throw new MockApiError(`Wrong code. ${MAX_CODE_FAILS - fails} attempt(s) left.`, 401);
    }
    flowSet(KEY_PENDING, null);
    flowSet(KEY_CODE_EXPIRY, null);
    flowSet(KEY_ACTIVE, user.healthId);
    return { success: true, session: sessionFor(user) } as T;
  }

  // POST /auth/resend-code (contract gap — confirm with tech lead; mock implements it)
  if (method === "POST" && endpoint === "/auth/resend-code") {
    const user = users.find((u) => u.healthId === flowGet(KEY_PENDING));
    if (!user) throw new MockApiError("No login in progress. Start again.", 400);
    const expiresAt = Date.now() + CODE_TTL_MS;
    flowSet(KEY_CODE_EXPIRY, String(expiresAt));
    flowSet(KEY_CODE_FAILS, "0");
    console.info("[mock] OTP code re-issued:", MOCK_DEMO_CODE);
    return { success: true, codeExpiresAt: new Date(expiresAt).toISOString() } as T;
  }

  // POST /auth/set-password
  if (method === "POST" && endpoint === "/auth/set-password") {
    const { newPassword } = body as { newPassword: string };
    const user = users.find((u) => u.healthId === flowGet(KEY_ACTIVE));
    if (!user) throw new MockApiError("No verified session. Verify a code first.", 400);
    if (typeof newPassword !== "string" || newPassword.length < 10) {
      throw new MockApiError("Password does not meet strength requirements.", 400);
    }
    user.mustChangePassword = false;
    user.password = newPassword;
    flowSet(KEY_ACTIVE, null);
    return { success: true } as T;
  }

  throw new MockApiError(`Mock route not implemented yet: ${method} ${endpoint}`, 404);
}