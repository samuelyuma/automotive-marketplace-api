import type { CachePort } from "../../application/ports/cache.port";
import { env } from "../../main/config/env";
import { redis } from "./client";
import { upstashRedis } from "./upstash";

export class RedisCache implements CachePort {
  async get<T>(key: string): Promise<T | null> {
    if (env.REDIS_BACKEND === "upstash")
      return (await upstashRedis?.get<T>(key)) ?? null;
    if (!redis.isReady) return null;
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }
  async set<T>(key: string, value: T, ttlSeconds = 60): Promise<void> {
    if (env.REDIS_BACKEND === "upstash") {
      await upstashRedis?.set(key, value, { ex: ttlSeconds });
      return;
    }
    if (!redis.isReady) return;
    await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
  }
  async del(key: string): Promise<void> {
    if (env.REDIS_BACKEND === "upstash") {
      await upstashRedis?.del(key);
      return;
    }
    if (!redis.isReady) return;
    await redis.del(key);
  }
}
