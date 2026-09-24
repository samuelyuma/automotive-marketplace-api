import { Elysia } from "elysia";

import { checkRedisHealth } from "@infrastructure/cache/redis-health";
import { checkDatabaseHealth } from "@infrastructure/database/health";
import {
  HealthModel,
  type HealthResponse,
  healthRouteDetail,
} from "@interface/validators/health.validator";

export const healthController = new Elysia().use(HealthModel).get(
  "/health-check",
  async ({ status }) => {
    const [dbHealthy, redisHealthy] = await Promise.all([
      checkDatabaseHealth(),
      checkRedisHealth(),
    ]);

    const health: HealthResponse = {
      app: "ok",
      db: dbHealthy ? "up" : "down",
      redis: redisHealthy ? "up" : "down",
      timestamp: new Date().toISOString(),
    };

    return dbHealthy && redisHealthy ? health : status(503, health);
  },
  {
    detail: healthRouteDetail,
    response: { 200: "health.ok", 503: "health.unavailable" },
  },
);
