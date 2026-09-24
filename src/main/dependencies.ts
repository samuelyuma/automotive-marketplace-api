import { connectRedis } from "@infrastructure/cache/redis-client";
import { checkRedisHealth } from "@infrastructure/cache/redis-health";
import { checkDatabaseHealth } from "@infrastructure/database/health";
import { logger } from "@infrastructure/logging/logger";

export async function initDependencies(): Promise<void> {
  const dbHealthy = await checkDatabaseHealth();
  if (!dbHealthy) {
    logger.error({}, "🚨 Database connection failed");
    process.exit(1);
  }
  logger.info({}, "✅ Database connected");

  try {
    await connectRedis();
    if (!(await checkRedisHealth()))
      throw new Error("Redis ping failed after connect");
    logger.info({}, "✅ Redis connected");
  } catch (error) {
    logger.error({ exception: error }, "🚨 Redis connection failed");
    process.exit(1);
  }
}
