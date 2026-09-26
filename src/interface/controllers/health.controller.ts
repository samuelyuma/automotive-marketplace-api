import { Elysia } from "elysia";

import { checkRedisHealth } from "../../infrastructure/cache/health";
import { checkDatabaseHealth } from "../../infrastructure/postgres/health";
import {
  HealthModel,
  type HealthResponse,
  healthRouteDetail,
} from "../validators/health.validator";
import { RateLimitModel } from "../validators/response.validator";

export const healthController = new Elysia()
  .use(HealthModel)
  .use(RateLimitModel)
  .get(
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

      return dbHealthy ? health : status(503, health);
    },
    {
      detail: healthRouteDetail,
      response: {
        200: "health.ok",
        429: "rate.limited",
        503: "health.unavailable",
      },
    },
  );
