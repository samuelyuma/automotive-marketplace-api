import type { CachePort } from "../../../application/ports/cache.port";
import { redis } from "./client";

export class TcpRedisCache implements CachePort {
  async get<T>(key: string) {
    if (!redis.isReady) return null;
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }
  async set<T>(key: string, value: T, ttlSeconds = 60) {
    if (!redis.isReady) return;
    await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
  }
  async del(key: string) {
    if (!redis.isReady) return;
    await redis.del(key);
  }
}
