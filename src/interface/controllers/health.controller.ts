import { Elysia } from "elysia";

import { checkRedisHealth } from "@infrastructure/cache/redis-health";
import { checkDatabaseHealth } from "@infrastructure/database/health";

export const healthController = new Elysia().get(
  "/health-check",
  async ({ status }) => {
    const [dbHealthy, redisHealthy] = await Promise.all([
      checkDatabaseHealth(),
      checkRedisHealth(),
    ]);

    const health = {
      app: "ok",
      db: dbHealthy ? "up" : "down",
      redis: redisHealthy ? "up" : "down",
      timestamp: new Date().toISOString(),
    };

    return dbHealthy && redisHealthy ? health : status(503, health);
  },
);
