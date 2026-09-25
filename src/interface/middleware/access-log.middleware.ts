import { Elysia } from "elysia";

import { logger } from "../../infrastructure/logging/logger";
import { requestContext } from "./request-context.middlware";

export const accessLog = new Elysia({ name: "access-log" })
  .use(requestContext)
  .onAfterResponse(
    { as: "global" },
    ({ request, set, requestId, durationMs }) => {
      logger.info(
        {
          request_id: requestId,
          http_method: request.method,
          http_status: set.status ?? 200,
          http_path: new URL(request.url).pathname,
          duration_ms: durationMs(),
        },
        "request completed",
      );
    },
  );
