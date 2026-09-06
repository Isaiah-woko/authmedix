import crypto from "crypto";
import { prisma } from "./prisma";
import { hmacSha256, timingSafeEqualHex, randomHex } from "./hash";

export const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getOtpSecret(): string {
  const secret = process.env.OTP_HMAC_SECRET;
  if (!secret) throw new Error("OTP_HMAC_SECRET is not set");
  return secret;
}

/** HMAC keyed by a server secret NOT stored in the DB. */
function hashCode(code: string, salt: string): string {
  return hmacSha256(getOtpSecret(), `${salt}:${code}`);
}

export function generateOtpCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/** Returns the plaintext code exactly once (to be emailed). Only the hash is stored. */
export async function issueLoginCode(userId: string): Promise<string> {
  const code = generateOtpCode();
  const salt = randomHex(16);
  const codeHash = hashCode(code, salt);

  await prisma.loginCode.create({
    data: { userId, codeHash, salt, expiresAt: new Date(Date.now() + OTP_TTL_MS) },
  });
  return code;
}

export async function verifyLoginCode(userId: string, code: string): Promise<boolean> {
  const loginCode = await prisma.loginCode.findFirst({
    where: { userId, used: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!loginCode) return false;

  const candidate = hashCode(code, loginCode.salt);
  const valid = timingSafeEqualHex(candidate, loginCode.codeHash);

  if (valid) {
    await prisma.loginCode.update({ where: { id: loginCode.id }, data: { used: true } });
  }
  return valid;
}

export async function hasUsableLoginCode(userId: string): Promise<boolean> {
  const count = await prisma.loginCode.count({
    where: { userId, used: false, expiresAt: { gt: new Date() } },
  });
  return count > 0;
}