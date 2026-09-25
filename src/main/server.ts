import openapi from "@elysia/openapi";
import Elysia from "elysia";

import { logger } from "../infrastructure/logging/logger";
import { checkUpstashRateLimit } from "../infrastructure/redis/upstash";
import { createCategoryController } from "../interface/controllers/category.controller";
import { createFilterController } from "../interface/controllers/filter.controller";
import { healthController } from "../interface/controllers/health.controller";
import { createListingController } from "../interface/controllers/listing.controller";
import { createListingSearchController } from "../interface/controllers/listing-search.controller";
import { accessLog } from "../interface/middleware/access-log.middleware";
import { errorHandler } from "../interface/middleware/error-handler.middleware";
import { createRateLimitPlugin } from "../interface/middleware/rate-limit.middleware";
import { requestContext } from "../interface/middleware/request-context.middleware";
import { env } from "./config/env";
import { buildContainer, type Container } from "./container";

export function createApp({
  container = buildContainer(),
  rateLimitEnabled = env.REDIS_BACKEND === "upstash",
  rateLimitCheck = checkUpstashRateLimit,
}: {
  container?: Container;
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
    .use(createCategoryController(container))
    .use(createFilterController(container))
    .use(createListingSearchController(container))
    .use(createListingController(container));
}

export function createServer() {
  return createApp().listen(env.PORT);
}
