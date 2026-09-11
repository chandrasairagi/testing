import crypto from "node:crypto";
import type { NextRequest } from "next/server";

type Bucket = { count: number; resetAt: number };
const globalForRateLimit = globalThis as typeof globalThis & { __hyderabadRentBuckets?: Map<string, Bucket> };
const buckets = globalForRateLimit.__hyderabadRentBuckets ?? new Map<string, Bucket>();
globalForRateLimit.__hyderabadRentBuckets = buckets;

export function requestFingerprint(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";
  const salt = process.env.RATE_LIMIT_SALT || "hyderabad-rent-public-beta";
  return crypto.createHash("sha256").update(`${salt}|${ip}|${userAgent}`).digest("hex");
}

export function allowRequest(fingerprint: string, action: string, limit: number, windowMs: number) {
  const now = Date.now(), key = `${action}:${fingerprint}`, current = buckets.get(key);
  if (!current || current.resetAt <= now) { buckets.set(key,{count:1,resetAt:now+windowMs}); return {allowed:true,remaining:Math.max(0,limit-1)}; }
  if (current.count >= limit) return {allowed:false,remaining:0,retryAfterMs:current.resetAt-now};
  current.count += 1; buckets.set(key,current); return {allowed:true,remaining:Math.max(0,limit-current.count)};
}
