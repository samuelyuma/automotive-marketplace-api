import { createHash, randomUUID } from "node:crypto";

import type { CachePort } from "../../application/ports/cache.port";
import { bestEffort } from "../../application/utils/best-effort";
import { logger } from "../../infrastructure/logging/logger";
import { requestLogFields } from "../../infrastructure/logging/request-log-context";

export type CacheResource = "categories" | "filters" | "listings";

type CachedReadOptions = {
  resource: CacheResource | CacheResource[];
  ttlSeconds?: number;
};

// Revision entries outlive the longest cached read (currently 300 seconds).
const revisionTtlSeconds = 600;
const defaultTtlSeconds = 60;

function revisionKey(resource: CacheResource) {
  return `catalog:read-revision:${resource}`;
}

function warnCacheFailure(operation: string, error: unknown) {
  logger.warn(
    {
      ...requestLogFields(),
      layer: "cache",
      operation,
      exception: error,
    },
    "catalog cache unavailable",
  );
}

export async function cachedRead<T>(
  cache: CachePort | undefined,
  request: Request,
  load: () => Promise<T>,
  { resource, ttlSeconds = defaultTtlSeconds }: CachedReadOptions,
): Promise<T> {
  if (!cache) return load();

  const resources = [
    ...new Set(Array.isArray(resource) ? resource : [resource]),
  ];
  let key: string;
  try {
    const revisions = await Promise.all(
      resources.map(
        async (name) =>
          [name, (await cache.get<string>(revisionKey(name))) ?? ""] as const,
      ),
    );
    const url = new URL(request.url);
    const hash = createHash("sha256")
      .update(JSON.stringify([revisions, url.pathname, url.search]))
      .digest("hex");
    key = `catalog:read:${hash}`;

    const cached = await cache.get<T>(key);
    if (cached !== null) {
      logger.debug(
        {
          ...requestLogFields(),
          layer: "cache",
          operation: "read",
          cache_hit: true,
          resources,
        },
        "catalog cache hit",
      );
      return cached;
    }
    logger.debug(
      {
        ...requestLogFields(),
        layer: "cache",
        operation: "read",
        cache_hit: false,
        resources,
      },
      "catalog cache miss",
    );
  } catch (error) {
    warnCacheFailure("read", error);
    return load();
  }

  const result = await load();
  await bestEffort(
    () => cache.set(key, result, ttlSeconds),
    (error) => warnCacheFailure("write", error),
  );
  return result;
}

export async function invalidateReadCache(
  cache: CachePort | undefined,
  resources: CacheResource[],
): Promise<void> {
  if (!cache) return;
  await Promise.all(
    [...new Set(resources)].map((resource) =>
      bestEffort(
        () =>
          cache.set(revisionKey(resource), randomUUID(), revisionTtlSeconds),
        (error) => warnCacheFailure("invalidate", error),
      ),
    ),
  );
}
