import Elysia, { type ValidationError } from "elysia";

import { DomainError, type ErrorKind } from "../../domain/errors/domain-error";
import { logger } from "../../infrastructure/logging/logger";
import {
  type ErrorResponse,
  errorResponse,
  standardErrors,
} from "../http/response";
import { requestContext } from "./request-context.middleware";

const statusByKind = {
  not_found: 404,
  conflict: 409,
  invalid: 422,
  bad_request: 400,
} as const satisfies Record<ErrorKind, number>;

type LogBase = {
  request_id: string | undefined;
  http_method: string;
  http_path: string;
  duration_ms: number;
};

type Handled = {
  status: number;
  body: ErrorResponse;
};

function buildLogBase(ctx: {
  request: Request;
  requestId?: string;
  durationMs?: () => number;
}): LogBase {
  return {
    request_id: ctx.requestId,
    http_method: ctx.request.method,
    http_path: new URL(ctx.request.url).pathname,
    duration_ms: ctx.durationMs?.() ?? 0,
  };
}

function handleDomainError(error: DomainError, base: LogBase): Handled {
  const mapped = statusByKind[error.kind];
  logger.warn(
    { ...base, http_status: mapped, error_code: error.code },
    error.message,
  );
  return {
    status: mapped,
    body: errorResponse(error.code, error.message, error.details),
  };
}

function handleValidationError(
  error: Readonly<ValidationError>,
  base: LogBase,
): Handled {
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
    return {
      status: 500,
      body: errorResponse(
        standardErrors.internal.code,
        standardErrors.internal.message,
      ),
    };
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
  return {
    status: 400,
    body: errorResponse(
      standardErrors.validation.code,
      standardErrors.validation.message,
      details,
    ),
  };
}

function handleParseError(base: LogBase): Handled {
  logger.warn(
    { ...base, http_status: 400, error_code: standardErrors.parse.code },
    "request parse failed",
  );
  return {
    status: 400,
    body: errorResponse(
      standardErrors.parse.code,
      standardErrors.parse.message,
    ),
  };
}

function handleNotFound(base: LogBase): Handled {
  logger.warn(
    {
      ...base,
      http_status: 404,
      error_code: standardErrors.notFound.code,
    },
    "route not found",
  );
  return {
    status: 404,
    body: errorResponse(
      standardErrors.notFound.code,
      standardErrors.notFound.message,
    ),
  };
}

function handleUnhandled(error: unknown, base: LogBase): Handled {
  logger.error(
    { ...base, http_status: 500, exception: error },
    "unhandled error",
  );
  return {
    status: 500,
    body: errorResponse(
      standardErrors.internal.code,
      standardErrors.internal.message,
    ),
  };
}

export const errorHandler = new Elysia({ name: "error-handler" })
  .use(requestContext)
  .onError({ as: "global" }, (ctx) => {
    const base = buildLogBase(ctx);
    if (ctx.error instanceof DomainError) {
      const handled = handleDomainError(ctx.error, base);
      return ctx.status(handled.status, handled.body);
    }
    if (ctx.code === "VALIDATION") {
      const handled = handleValidationError(ctx.error, base);
      return ctx.status(handled.status, handled.body);
    }
    if (ctx.code === "PARSE") {
      const handled = handleParseError(base);
      return ctx.status(handled.status, handled.body);
    }
    if (ctx.code === "NOT_FOUND") {
      const handled = handleNotFound(base);
      return ctx.status(handled.status, handled.body);
    }
    const handled = handleUnhandled(ctx.error, base);
    return ctx.status(handled.status, handled.body);
  });
