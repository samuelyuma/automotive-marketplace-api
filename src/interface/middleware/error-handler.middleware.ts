import Elysia from "elysia";

import { DomainError, type ErrorKind } from "../../domain/errors/domain-error";
import { logger } from "../../infrastructure/logging/logger";
import { errorResponse, standardErrors } from "../http/response";
import { requestContext } from "./request-context.middlware";

const statusByKind = {
  not_found: 404,
  conflict: 409,
  invalid: 422,
  bad_request: 400,
} as const satisfies Record<ErrorKind, number>;

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

      if (error instanceof DomainError) {
        const mapped = (statusByKind as Record<string, number>)[error.kind];
        if (mapped === undefined) {
          logger.error(
            { ...base, error_kind: error.kind, error_code: error.code },
            "unmapped domain error kind",
          );
          return status(
            500,
            errorResponse(
              standardErrors.internal.code,
              standardErrors.internal.message,
            ),
          );
        }
        logger.warn(
          { ...base, http_status: mapped, error_code: error.code },
          error.message,
        );
        return status(
          mapped,
          errorResponse(error.code, error.message, error.details),
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
            standardErrors.validation.code,
            standardErrors.validation.message,
            details,
          ),
        );
      }

      if (code === "PARSE")
        return status(
          400,
          errorResponse(
            standardErrors.parse.code,
            standardErrors.parse.message,
          ),
        );

      if (code === "NOT_FOUND")
        return status(
          404,
          errorResponse(
            standardErrors.notFound.code,
            standardErrors.notFound.message,
          ),
        );

      logger.error(
        { ...base, http_status: 500, exception: error },
        "unhandled error",
      );
      return status(
        500,
        errorResponse(
          standardErrors.internal.code,
          standardErrors.internal.message,
        ),
      );
    },
  );
