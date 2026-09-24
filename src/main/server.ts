import openapi from "@elysia/openapi";
import Elysia from "elysia";

import { logger } from "@infrastructure/logging/logger";
import { healthController } from "@interface/controllers/health.controller";
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
    .listen(env.PORT);
}
