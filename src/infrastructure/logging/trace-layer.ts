import { logger } from "./logger";
import { requestLogFields } from "./request-log-context";

function resultFields(value: unknown) {
  if (Array.isArray(value)) return { result_count: value.length };
  if (value === null || value === undefined) return { found: false };
  if (typeof value === "object") {
    const result = value as Record<string, unknown>;
    if (Array.isArray(result.rows)) return { result_count: result.rows.length };
    if (Array.isArray(result.data)) return { result_count: result.data.length };
    return { found: true };
  }
  return {};
}

export function traceLayer<T extends object>(
  layer: "service" | "repository",
  component: string,
  target: T,
): T {
  return new Proxy(target, {
    get(object, property, receiver) {
      const method = Reflect.get(object, property, receiver);
      if (typeof method !== "function" || typeof property !== "string")
        return method;
      return (...args: unknown[]) => {
        const fields = {
          ...requestLogFields(),
          layer,
          component,
          operation: property,
        };
        const startedAt = performance.now();
        logger.debug(fields, "operation started");
        const completed = (value: unknown) => {
          logger.debug(
            {
              ...fields,
              ...resultFields(value),
              duration_ms: Math.round(performance.now() - startedAt),
            },
            "operation completed",
          );
          return value;
        };
        const failed = (error: unknown): never => {
          logger.error(
            {
              ...fields,
              duration_ms: Math.round(performance.now() - startedAt),
              exception: error,
            },
            "operation failed",
          );
          throw error;
        };
        try {
          const result = Reflect.apply(method, object, args);
          return result instanceof Promise
            ? result.then(completed, failed)
            : completed(result);
        } catch (error) {
          return failed(error);
        }
      };
    },
  });
}
