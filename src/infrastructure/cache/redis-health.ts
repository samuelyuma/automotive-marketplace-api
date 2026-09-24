import { redis } from "./redis-client";

export async function checkRedisHealth(): Promise<boolean> {
  try {
    return (await redis.ping()) === "PONG";
  } catch {
    return false;
  }
}
