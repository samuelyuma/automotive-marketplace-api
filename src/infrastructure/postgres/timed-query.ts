import { logger } from "@infrastructure/logging/logger";

import { env } from "@main/config/env";

const dbLogger = logger.child({ module: "database" });

const SLOW_QUERY_THRESHOLDS_MS = {
  light: 100,
  heavy: 500,
} as const;

type QueryWeight = keyof typeof SLOW_QUERY_THRESHOLDS_MS;

export async function timedQuery<T>(
  label: string,
  weight: QueryWeight,
  fn: () => Promise<T>,
): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const duration_ms = Math.round(performance.now() - start);
    const threshold_ms = SLOW_QUERY_THRESHOLDS_MS[weight];

    if (duration_ms > threshold_ms) {
      dbLogger.warn(
        { query: label, weight, duration_ms, threshold_ms },
        "slow query detected",
      );
    } else if (env.LOG_LEVEL === "debug") {
      dbLogger.debug({ query: label, weight, duration_ms }, "query completed");
    }
  }
}
