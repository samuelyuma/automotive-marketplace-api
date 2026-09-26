import { checkRedisHealth } from "../infrastructure/cache/health";
import { connectRedis } from "../infrastructure/cache/redis/client";
import { isUpstashBackend } from "../infrastructure/cache/redis-backend";
import { logger } from "../infrastructure/logging/logger";
import { checkDatabaseHealth } from "../infrastructure/postgres/health";

export async function initDependencies(): Promise<void> {
  const dbHealthy = await checkDatabaseHealth();
  if (!dbHealthy) {
    logger.error({}, "🚨 Database connection failed");
    process.exit(1);
  }
  logger.info({}, "✅ Database connected");

  try {
    if (!isUpstashBackend) await connectRedis();
    if (!(await checkRedisHealth()))
      throw new Error("Redis ping failed after connect");
    logger.info({}, "✅ Redis connected");
  } catch (error) {
    logger.warn(
      { exception: error },
      "Redis unavailable; continuing without cache",
    );
  }
}
