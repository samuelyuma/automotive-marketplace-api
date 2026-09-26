import type { CachePort } from "../../../application/ports/cache.port";
import { upstashRedis } from "./upstash-client";

export class UpstashRedisCache implements CachePort {
  async get<T>(key: string) {
    return (await upstashRedis?.get<T>(key)) ?? null;
  }
  async set<T>(key: string, value: T, ttlSeconds = 60) {
    await upstashRedis?.set(key, value, { ex: ttlSeconds });
  }
  async del(key: string) {
    await upstashRedis?.del(key);
  }
}
