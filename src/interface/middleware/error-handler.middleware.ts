import Elysia from "elysia";

import { DomainError, type ErrorKind } from "../../domain/errors/domain-error";
import { logger } from "../../infrastructure/logging/logger";
import { errorResponse, standardErrors } from "../http/response";
import { requestContext } from "./request-context.middleware";

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
        if (error.type === "response") {
          logger.error(
            {
              ...base,
              http_status: 500,
              error_code: standardErrors.internal.code,
              validation_source: error.type,
              validation_details: details,
              invalid_ids: error.all
                ?.filter((e) => /(?:^|\/)id$/.test(e.path ?? ""))
                .slice(0, 5)
                .map((e) => String(e.value)),
            },
            "response validation failed",
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
          {
            ...base,
            http_status: 400,
            error_code: standardErrors.validation.code,
            validation_source: error.type,
            validation_details: details,
          },
          "request validation failed",
        );
        return status(
          400,
          errorResponse(
            standardErrors.validation.code,
            standardErrors.validation.message,
            details,
          ),
        );
      }

      if (code === "PARSE") {
        logger.warn(
          { ...base, http_status: 400, error_code: standardErrors.parse.code },
          "request parse failed",
        );
        return status(
          400,
          errorResponse(
            standardErrors.parse.code,
            standardErrors.parse.message,
          ),
        );
      }

      if (code === "NOT_FOUND") {
        logger.warn(
          {
            ...base,
            http_status: 404,
            error_code: standardErrors.notFound.code,
          },
          "route not found",
        );
        return status(
          404,
          errorResponse(
            standardErrors.notFound.code,
            standardErrors.notFound.message,
          ),
        );
      }

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
