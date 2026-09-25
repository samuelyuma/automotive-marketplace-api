import openapi from "@elysia/openapi";
import Elysia from "elysia";

import { logger } from "../infrastructure/logging/logger";
import { checkUpstashRateLimit } from "../infrastructure/redis/upstash";
import { categoryController } from "../interface/controllers/category.controller";
import { filterController } from "../interface/controllers/filter.controller";
import { healthController } from "../interface/controllers/health.controller";
import { listingController } from "../interface/controllers/listing.controller";
import { listingSearchController } from "../interface/controllers/listing-search.controller";
import { accessLog } from "../interface/middleware/access-log.middleware";
import { errorHandler } from "../interface/middleware/error-handler.middleware";
import { createRateLimitPlugin } from "../interface/middleware/rate-limit.middleware";
import { requestContext } from "../interface/middleware/request-context.middlware";
import { env } from "./config/env";

export function createApp({
  rateLimitEnabled = env.REDIS_BACKEND === "upstash",
  rateLimitCheck = checkUpstashRateLimit,
}: {
  rateLimitEnabled?: boolean;
  rateLimitCheck?: typeof checkUpstashRateLimit;
} = {}) {
  return new Elysia()
    .use(logger.into({ autoLogging: false }))
    .use(errorHandler)
    .use(requestContext)
    .use(accessLog)
    .use(
      createRateLimitPlugin({
        enabled: rateLimitEnabled,
        check: rateLimitCheck,
      }),
    )
    .use(openapi({ path: "/docs" }))
    .use(healthController)
    .use(categoryController)
    .use(filterController)
    .use(listingSearchController)
    .use(listingController);
}

export function createServer() {
  return createApp().listen(env.PORT);
}
