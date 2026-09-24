import { Elysia } from "elysia";

import { AppError } from "@domain/errors/app-error";
import { logger } from "@infrastructure/logging/logger";
import { errorResponse } from "@interface/http/response";

import { requestContext } from "./request-context.middlware";

export const errorHandler = new Elysia({ name: "error-handler" })
  .use(requestContext)
  .onError(
    { as: "global" },
    ({ code, error, status, request, requestId, durationMs }) => {
      const base = {
        request_id: requestId,
        http_method: request.method,
        http_path: new URL(request.url).pathname,
        duration_ms: durationMs?.() ?? 0,
      };

      if (error instanceof AppError) {
        logger.warn({ ...base, http_status: error.statusCode }, error.message);
        return status(
          error.statusCode,
          errorResponse(error.errorCode, error.message),
        );
      }
      if (code === "VALIDATION") {
        const details = error.all?.map((e) => ({
          field: e.path?.replace(/^\//, "") || "(root)",
          issue: e.message,
        }));
        return status(
          400,
          errorResponse(
            "VALIDATION_ERROR",
            "Request validation failed",
            details,
          ),
        );
      }
      if (code === "NOT_FOUND")
        return status(404, errorResponse("NOT_FOUND", "Route not found"));

      logger.error(
        { ...base, http_status: 500, exception: error },
        "unhandled error",
      );
      return status(
        500,
        errorResponse("INTERNAL_SERVER_ERROR", "Something went wrong"),
      );
    },
  );
