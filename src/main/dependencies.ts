import { logger } from "@infrastructure/logging/logger";
import { checkDatabaseHealth } from "@infrastructure/postgres/health";
import { connectRedis } from "@infrastructure/redis/client";
import { checkRedisHealth } from "@infrastructure/redis/health";

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
