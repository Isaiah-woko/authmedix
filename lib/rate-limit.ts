// lib/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Initialize the serverless Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// 1. Login & OTP Verification: 5 attempts per 15 minutes per (IP + Health ID)
// Prevents brute-forcing a specific account from a specific location.
export const authLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "15 m"),
  analytics: true,
  prefix: "authmedix:auth",
});

// 2. Sensitive Admin Actions & Step-Up: 5 attempts per 15 minutes
// Covers step-up code generation, passport approval, direct grants, staff creation
export const sensitiveActionLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "15 m"),
  prefix: "meditrust:sensitive",
});



// Helper to reliably extract the client IP in Next.js App Router / Vercel
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  const realIp = headers.get("x-real-ip");
  return forwarded ? forwarded.split(",")[0].trim() : realIp || "unknown";
}