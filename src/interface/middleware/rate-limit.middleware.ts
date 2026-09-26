import { Elysia } from "elysia";

import { logger } from "../../infrastructure/logging/logger";
import { errorResponse, standardErrors } from "../http/response";

type Bucket = "read" | "write";
type LimitResult = { success: boolean; reset: number };

type RateLimitOptions = {
  enabled?: boolean;
  check: (bucket: Bucket, ip: string) => Promise<LimitResult>;
};

// Read and write requests use separate rate-limit buckets.
export function createRateLimitPlugin({
  enabled = true,
  check,
}: RateLimitOptions) {
  return new Elysia({ name: "rate-limit" })
    .onBeforeHandle({ as: "global" }, async ({ request, status, set }) => {
      if (!enabled) return;

      const bucket: Bucket =
        request.method === "GET" || request.method === "HEAD"
          ? "read"
          : "write";
      // The first forwarded address is the key used by the limiter.
      const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        "unknown";

      try {
        const result = await check(bucket, ip);
        if (result.success) return;

        // Tell the client how many whole seconds remain until reset.
        set.headers["retry-after"] = String(
          Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
        );
        return status(
          429,
          errorResponse(
            standardErrors.rateLimited.code,
            standardErrors.rateLimited.message,
          ),
        );
      } catch (error) {
        // Let requests through when the limiter backend is unavailable.
        logger.warn({ exception: error }, "rate limiter unavailable");
      }
    })
    .as("global");
}
