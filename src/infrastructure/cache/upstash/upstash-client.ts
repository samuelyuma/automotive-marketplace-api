import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { env } from "../../../main/config/env";
import { isUpstashBackend } from "../redis-backend";

const redis =
  isUpstashBackend && env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
        retry: { retries: 0 },
        signal: () => AbortSignal.timeout(1000),
      })
    : undefined;
export const upstashRedis = redis;

const readLimiter =
  redis &&
  new Ratelimit({
    redis,
    prefix: "automotive:rate:read",
    limiter: Ratelimit.slidingWindow(60, "1 m"),
  });

const writeLimiter =
  redis &&
  new Ratelimit({
    redis,
    prefix: "automotive:rate:write",
    limiter: Ratelimit.slidingWindow(10, "1 m"),
  });

type Decision = { success: boolean; reset: number; reason?: string };

export function requireRateLimitDecision(result: Decision) {
  if (result.reason === "timeout")
    throw new Error("rate limit check timed out");
  return { success: result.success, reset: result.reset };
}

export async function checkUpstashRateLimit(
  bucket: "read" | "write",
  ip: string,
) {
  const limiter = bucket === "read" ? readLimiter : writeLimiter;
  if (!limiter) throw new Error("Upstash rate limiter is not configured");
  return requireRateLimitDecision(await limiter.limit(ip));
}

export async function pingUpstash(): Promise<boolean> {
  if (!redis) return false;
  return (await redis.ping()) === "PONG";
}
