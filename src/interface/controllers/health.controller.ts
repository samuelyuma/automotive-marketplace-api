import { Elysia } from "elysia";

import { checkDatabaseHealth } from "../../infrastructure/postgres/health";
import { checkRedisHealth } from "../../infrastructure/redis/health";
import {
  HealthModel,
  type HealthResponse,
  healthRouteDetail,
} from "../validators/health.validator";

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
