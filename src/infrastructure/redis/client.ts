import { createClient } from "redis";

import { logger } from "@infrastructure/logging/logger";

import { env } from "@main/config/env";

export const redis = createClient({ url: env.REDIS_URL });

redis.on("error", (err) =>
  logger.error({ exception: err }, "redis client error"),
);

export async function connectRedis(): Promise<void> {
  if (!redis.isOpen) await redis.connect();
}
