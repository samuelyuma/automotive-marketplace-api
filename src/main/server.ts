import openapi from "@elysia/openapi";
import Elysia from "elysia";

import { logger } from "@infrastructure/logging/logger";

import { categoryController } from "@interface/controllers/category.controller";
import { healthController } from "@interface/controllers/health.controller";
import { listingController } from "@interface/controllers/listing.controller";
import { accessLog } from "@interface/middleware/access-log.middleware";
import { errorHandler } from "@interface/middleware/error-handler.middleware";
import { requestContext } from "@interface/middleware/request-context.middlware";

import { env } from "./config/env";

export function createServer() {
  return new Elysia()
    .use(logger.into({ autoLogging: false }))
    .use(errorHandler)
    .use(requestContext)
    .use(accessLog)
    .use(openapi({ path: "/docs" }))
    .use(healthController)
    .use(categoryController)
    .use(listingController)
    .listen(env.PORT);
}
