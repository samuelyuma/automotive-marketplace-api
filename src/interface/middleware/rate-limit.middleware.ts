import { Elysia } from "elysia";

import { logger } from "@infrastructure/logging/logger";

import { errorResponse } from "@interface/http/response";

type Bucket = "read" | "write";
type LimitResult = { success: boolean; reset: number };

type RateLimitOptions = {
  enabled?: boolean;
  check: (bucket: Bucket, ip: string) => Promise<LimitResult>;
};

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
      const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        "unknown";

      try {
        const result = await check(bucket, ip);
        if (result.success) return;

        set.headers["retry-after"] = String(
          Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
        );
        return status(429, errorResponse("RATE_LIMITED", "Too many requests"));
      } catch (error) {
        logger.error({ exception: error }, "rate limiter unavailable");
        return status(
          503,
          errorResponse(
            "RATE_LIMIT_UNAVAILABLE",
            "Service temporarily unavailable",
          ),
        );
      }
    })
    .as("global");
}
