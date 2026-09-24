import { Elysia } from "elysia";

type RequestContextValues = {
  requestId: string;
  durationMs: () => number;
};

export const requestContext = new Elysia({ name: "request-context" })
  .onRequest((context) => {
    const startedAt = performance.now();
    const requestId =
      context.request.headers.get("x-request-id") ?? crypto.randomUUID();

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
