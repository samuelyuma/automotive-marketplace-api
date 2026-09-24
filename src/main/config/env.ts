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
  REDIS_URL: t.String({ minLength: 1, default: "redis://localhost:6379" }),
});

type Env = typeof EnvSchema.static;

function loadEnv(): Env {
  if (!Value.Check(EnvSchema, process.env)) {
    const errors = [...Value.Errors(EnvSchema, process.env)];
    console.error(
      "✗ Invalid environment configuration:\n" +
        errors.map((e) => `  - ${e.path}: ${e.message}`).join("\n"),
    );
    process.exit(1);
  }
  return Value.Cast(EnvSchema, process.env);
}

export const env = loadEnv();
