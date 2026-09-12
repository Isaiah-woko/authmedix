import { auth } from "./auth";
import { prisma } from "./prisma";
import { writeAuditLog } from "./audit";
import {
  getVisibleFields,
  getEmergencySummaryFields,
  type RoleFieldVisibility,
} from "./role-fields";
import type { Role, PassportType, User, AccessPassport } from "@prisma/client";


// ── Fixed duration presets (clinical protocol, not arbitrary admin input) ──

export const DURATION_MS: Record<string, number> = {
  "8H": 8 * 3_600_000,
  "24H": 24 * 3_600_000,
  REFERRAL: 48 * 3_600_000,
  BREAK_GLASS: 2 * 3_600_000,
};

// ── Deny reasons (frontend uses these exact strings to pick copy) ──

export type DenyReason =
  | "INACTIVE_SESSION"
  | "NO_PASSPORT"
  | "PASSPORT_EXPIRED"
  | "PASSPORT_REVOKED"
  | "ROLE_DENIED";

export interface AccessResult {
  allowed: boolean;
  denyReason?: DenyReason;
  visibility?: RoleFieldVisibility;
  passport?: AccessPassport;
  patientMissing?: boolean
}

// ── requireAuth: session + live DB status check ──

/**
 * Validates the session token, then re-fetches the user from the DB.
 * This ensures a mid-session suspension/lockout takes effect on the
 * very next request — not at TTL expiry.
 *
 * Returns the full DB User, or null if unauthenticated/inactive.
 */

function isSessionStale(
  session: { user?: { sessionExpiresAt?: string }; issuedAt?: string },
  user: User,
): boolean {
  const expiresAt = session.user?.sessionExpiresAt
    ? new Date(session.user.sessionExpiresAt)
    : null;
  if (expiresAt && expiresAt <= new Date()) return true;

  if (user.sessionInvalidatedAt) {
    // Read from session root
    const issuedAt = session.issuedAt ? new Date(session.issuedAt) : null;
    if (!issuedAt || issuedAt < user.sessionInvalidatedAt) return true;
  }
  return false;
}

export async function requireAuth(): Promise<User | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.status !== "ACTIVE") return null;

  // Continuous TTL check (defense-in-depth; middleware also checks this).
  const expiresAt = session.user.sessionExpiresAt
    ? new Date(session.user.sessionExpiresAt)
    : null;
  if (expiresAt && expiresAt <= new Date()) return null;

  // Forced-change gate at the route layer: a live session must not survive a force-reset.
  if (user.mustChangePassword) return null;

  if (isSessionStale(session, user)) return null;

  return user;
}

/**
 * For the set-password route only: allows forced-change sessions,
 * but still rejects inactive users and sessions invalidated by a force-reset.
 * The route decides forced vs voluntary mode from the DB flag (source of truth).
 */
export async function requireSessionForPasswordChange(): Promise<User | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.status !== "ACTIVE") return null;

  if (isSessionStale(session, user)) return null;

  return user;
}

// ── requireRole: role gate for Admin-only (or role-specific) routes ──

/**
 * Wraps requireAuth with a role check.
 * Returns the user if authorized, or null if unauthenticated or wrong role.
 */
export async function requireRole(
  ...allowedRoles: Role[]
): Promise<User | null> {
  const user = await requireAuth();
  if (!user) return null;
  if (!allowedRoles.includes(user.role)) return null;
  return user;
}

// ── checkAccess: the single gate for all patient-data routes ──

/**
 * The one function every patient-data API route must call.
 *
 * Logic order (Backend Brief §6):
 *   1. SEARCH → always allowed, identity-only fields
 *   2. Find passport for (userId, patientId):
 *      - none at all          → NO_PASSPORT
 *      - most recent REVOKED  → PASSPORT_REVOKED
 *      - expired / not ACTIVE → PASSPORT_EXPIRED
 *      - ACTIVE + unexpired   → proceed
 *   3. Scope check (if requiredScope given)
 *   4. BREAK_GLASS → fixed Emergency Summary; else → role-field filter
 *   5. Write audit log (allowed AND denied)
 *   6. Return result
 */
export async function checkAccess(input: {
  userId: string;
  patientId: string;
  action: string;
  requiredScope?: string;
}): Promise<AccessResult> {
  const { userId, patientId, action, requiredScope } = input;

  // 0. Live status re-check (defense-in-depth).
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.status !== "ACTIVE") {
    await writeAuditLog({
      userId,
      patientId,
      action,
      outcome: "DENIED",
      reason: "INACTIVE_SESSION",
    });
    return { allowed: false, denyReason: "INACTIVE_SESSION" };
  }

  // 1. SEARCH is always allowed, identity-only — short-circuit, no audit.
  if (action === "SEARCH") {
    return { allowed: true };
  }

    // 1.5. Ghost patient check (prevents P2003 FK crash and allows 404 routing)
  const patientExists = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { id: true },
  });
  if (!patientExists) {
    await writeAuditLog({
      userId,
      patientId, 
      action,
      outcome: "DENIED",
      reason: "UNKNOWN_PATIENT",
    });
    return { allowed: false, denyReason: "NO_PASSPORT", patientMissing: true };
  }

  // 2. Passport lookup.
  //    First: try to find an active, unexpired passport.
  const activePassport = await prisma.accessPassport.findFirst({
    where: {
      userId,
      patientId,
      status: "ACTIVE",
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!activePassport) {
    // No active passport. Find the most recent one (any status) to
    // determine the *specific* deny reason for the frontend.
    const latestPassport = await prisma.accessPassport.findFirst({
      where: { userId, patientId },
      orderBy: { createdAt: "desc" },
    });

    if (!latestPassport) {
      await writeAuditLog({
        userId,
        patientId,
        action,
        outcome: "DENIED",
        reason: "NO_PASSPORT",
      });
      return { allowed: false, denyReason: "NO_PASSPORT" };
    }

    if (latestPassport.status === "REVOKED") {
      await writeAuditLog({
        userId,
        patientId,
        action,
        outcome: "DENIED",
        reason: "PASSPORT_REVOKED",
      });
      return { allowed: false, denyReason: "PASSPORT_REVOKED" };
    }

    // ACTIVE but expired, or status EXPIRED.
    await writeAuditLog({
      userId,
      patientId,
      action,
      outcome: "DENIED",
      reason: "PASSPORT_EXPIRED",
    });
    return { allowed: false, denyReason: "PASSPORT_EXPIRED" };
  }

  // 3. Scope check.
  if (
    requiredScope &&
    activePassport.scope.length > 0 &&
    !activePassport.scope.includes(requiredScope)
  ) {
    await writeAuditLog({
      userId,
      patientId,
      action,
      outcome: "DENIED",
      reason: "ROLE_DENIED",
    });
    return { allowed: false, denyReason: "ROLE_DENIED" };
  }

  // 4. Field visibility.
  const visibility: RoleFieldVisibility =
    activePassport.type === "BREAK_GLASS"
      ? getEmergencySummaryFields()
      : getVisibleFields(user.role);

  // 5. Audit log — allowed.
  await writeAuditLog({
    userId,
    patientId,
    action,
    outcome: "ALLOWED",
  });

  // 6. Return.
  return {
    allowed: true,
    visibility,
    passport: activePassport,
  };
}