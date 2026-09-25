import { createHash } from "node:crypto";

import type { CachePort } from "../../application/ports/cache.port";

const revisionKey = "catalog:read-revision";
const ttlSeconds = 60;

export async function cachedRead<T>(
  cache: CachePort | undefined,
  request: Request,
  load: () => Promise<T>,
): Promise<T> {
  if (!cache) return load();

  let key: string;
  try {
    const revision = (await cache.get<string>(revisionKey)) ?? "0";
    const url = new URL(request.url);
    const hash = createHash("sha256")
      .update(`${revision}:${url.pathname}${url.search}`)
      .digest("hex");
    key = `catalog:read:${hash}`;
    const cached = await cache.get<T>(key);
    if (cached !== null) return cached;
  } catch {
    return load();
  }

  const result = await load();
  try {
    await cache.set(key, result, ttlSeconds);
  } catch {
    // Reads remain available when Redis is down.
  }
  return result;
}

export async function invalidateReadCache(
  cache: CachePort | undefined,
): Promise<void> {
  try {
    await cache?.set(revisionKey, crypto.randomUUID(), ttlSeconds);
  } catch {
    // The database write has already succeeded.
  }
}
