import { Value } from "@sinclair/typebox/value";
import { t } from "elysia";

const EnvSchema = t.Object({
  NODE_ENV: t.Union(
    [t.Literal("development"), t.Literal("production"), t.Literal("test")],
    { default: "development" },
  ),
  PORT: t.Numeric({ default: 8080 }),
  LOG_LEVEL: t.Union(
    [
      t.Literal("debug"),
      t.Literal("info"),
      t.Literal("warn"),
      t.Literal("error"),
    ],
    { default: "info" },
  ),
  DATABASE_URL: t.String({ minLength: 1 }),
  DATABASE_URL_UNPOOLED: t.Optional(t.String({ minLength: 1 })),
  REDIS_BACKEND: t.Union([t.Literal("tcp"), t.Literal("upstash")], {
    default: "tcp",
  }),
  REDIS_URL: t.String({ minLength: 1, default: "redis://localhost:6379" }),
  UPSTASH_REDIS_REST_URL: t.Optional(t.String({ minLength: 1 })),
  UPSTASH_REDIS_REST_TOKEN: t.Optional(t.String({ minLength: 1 })),
});

type Env = typeof EnvSchema.static;

function loadEnv(): Env {
  const input = Value.Default(EnvSchema, { ...process.env });
  if (!Value.Check(EnvSchema, input)) {
    const errors = [...Value.Errors(EnvSchema, input)];
    console.error(
      "✗ Invalid environment configuration:\n" +
        errors.map((e) => `  - ${e.path}: ${e.message}`).join("\n"),
    );
    process.exit(1);
  }
  const decoded = Value.Decode(EnvSchema, input);
  if (process.env.VERCEL && decoded.REDIS_BACKEND !== "upstash") {
    console.error("✗ Vercel requires REDIS_BACKEND=upstash");
    process.exit(1);
  }
  if (
    decoded.REDIS_BACKEND === "upstash" &&
    (!decoded.UPSTASH_REDIS_REST_URL || !decoded.UPSTASH_REDIS_REST_TOKEN)
  ) {
    console.error(
      "✗ Upstash requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN",
    );
    process.exit(1);
  }
  return decoded;
}

export const env = loadEnv();
