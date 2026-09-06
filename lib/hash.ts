import crypto from "crypto";

export function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

/** HMAC-SHA256 — keyed, so it can't be precomputed without the secret. */
export function hmacSha256(keyHex: string, input: string): string {
  return crypto.createHmac("sha256", Buffer.from(keyHex, "hex")).update(input).digest("hex");
}

/** Constant-time comparison of two hex strings. */
export function timingSafeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export function randomHex(bytes: number): string {
  return crypto.randomBytes(bytes).toString("hex");
}