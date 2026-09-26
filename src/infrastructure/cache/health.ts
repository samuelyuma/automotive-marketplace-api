import { redis } from "./redis/client";
import { isUpstashBackend } from "./redis-backend";
import { pingUpstash } from "./upstash/upstash-client";

export async function checkRedisHealth(): Promise<boolean> {
  try {
    if (isUpstashBackend) return await pingUpstash();
    return (await redis.ping()) === "PONG";
  } catch {
    return false;
  }
}
