import crypto from "crypto";
import { prisma } from "./prisma";

const GENESIS_HASH = "0".repeat(64);

interface ChainInput {
  prevHash: string;
  userId: string | null;
  patientId: string | null;
  action: string;
  outcome: string;
  reason: string | null;
  flagged: boolean;
  createdAt: Date;
}

function computeEntryHash(i: ChainInput): string {
  const payload = [
    i.prevHash,
    i.userId ?? "",
    i.patientId ?? "",
    i.action,
    i.outcome,
    i.reason ?? "",
    i.flagged ? "1" : "0",
    i.createdAt.toISOString(),
  ].join("|");
  return crypto.createHash("sha256").update(payload).digest("hex");
}

export async function writeAuditLog(input: {
  userId?: string | null;
  patientId?: string | null;
  action: string;
  outcome: string;
  reason?: string | null;
  flagged?: boolean;
}) {
  // Link to the previous entry. (Demo-grade: low write concurrency. In production,
  // serialize writes via a queue/lock to avoid two entries grabbing the same prevHash.)
  const last = await prisma.auditLog.findFirst({
    orderBy: { seq: "desc" },
    select: { entryHash: true },
  });
  const prevHash = last?.entryHash ?? GENESIS_HASH;
  const createdAt = new Date();

  const entryHash = computeEntryHash({
    prevHash,
    userId: input.userId ?? null,
    patientId: input.patientId ?? null,
    action: input.action,
    outcome: input.outcome,
    reason: input.reason ?? null,
    flagged: input.flagged ?? false,
    createdAt,
  });

  return prisma.auditLog.create({
    data: {
      userId: input.userId ?? null,
      patientId: input.patientId ?? null,
      action: input.action,
      outcome: input.outcome,
      reason: input.reason ?? null,
      flagged: input.flagged ?? false,
      prevHash,
      entryHash,
      createdAt,
    },
  });
}

/** Walks the chain and recomputes every hash. Returns false + the broken entry if tampered. */
export async function verifyAuditChain(): Promise<{ valid: boolean; brokenAt?: string }> {
  const entries = await prisma.auditLog.findMany({ orderBy: { seq: "asc" } });
  let prevHash = GENESIS_HASH;

  for (const e of entries) {
    const expected = computeEntryHash({
      prevHash,
      userId: e.userId,
      patientId: e.patientId,
      action: e.action,
      outcome: e.outcome,
      reason: e.reason,
      flagged: e.flagged,
      createdAt: e.createdAt,
    });
    if (e.prevHash !== prevHash || expected !== e.entryHash) {
      return { valid: false, brokenAt: e.id };
    }
    prevHash = e.entryHash;
  }
  return { valid: true };
}