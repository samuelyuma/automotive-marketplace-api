import { Elysia } from "elysia";

import { startRequestLogContext } from "../../infrastructure/logging/request-log-context";

type RequestContextValues = {
  requestId: string;
  durationMs: () => number;
};

// Share one request ID and timer with logs, errors, and the response header.
export const requestContext = new Elysia({ name: "request-context" })
  .onRequest((context) => {
    const startedAt = performance.now();
    const requestId =
      context.request.headers.get("x-request-id") ?? crypto.randomUUID();

    startRequestLogContext(requestId);

    // Elysia's derive hook reads these values later in the request.
    Object.assign(context, {
      requestId,
      durationMs: () => Math.round(performance.now() - startedAt),
    });
    context.set.headers["x-request-id"] = requestId;
  })
  .derive({ as: "global" }, (context) => {
    const { requestId, durationMs } = context as typeof context &
      RequestContextValues;
    return { requestId, durationMs };
  })
  .as("global");
