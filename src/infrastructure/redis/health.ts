import { env } from "../../main/config/env";
import { redis } from "./client";
import { pingUpstash } from "./upstash";

export async function checkRedisHealth(): Promise<boolean> {
  try {
    if (env.REDIS_BACKEND === "upstash") return await pingUpstash();
    return (await redis.ping()) === "PONG";
  } catch {
    return false;
  }
}
