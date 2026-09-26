import { Elysia, t } from "elysia";

const healthFields = {
  app: t.Literal("ok"),
  db: t.Union([t.Literal("up"), t.Literal("down")]),
  redis: t.Union([t.Literal("up"), t.Literal("down")]),
  timestamp: t.String({ format: "date-time" }),
};

export const HealthModel = new Elysia().model({
  "health.ok": t.Object(healthFields, {
    description:
      "Application and database are healthy; Redis status is reported separately",
    examples: [
      {
        app: "ok",
        db: "up",
        redis: "up",
        timestamp: "2026-09-24T00:00:00.000Z",
      },
    ],
  }),
  "health.unavailable": t.Object(healthFields, {
    description: "The database is unavailable",
    examples: [
      {
        app: "ok",
        db: "down",
        redis: "up",
        timestamp: "2026-09-24T00:00:00.000Z",
      },
    ],
  }),
});

export const healthRouteDetail = {
  summary: "Check Application Health",
  description: "Checks PostgreSQL and Redis connectivity.",
  tags: ["Health"],
};

export type HealthResponse = {
  app: "ok";
  db: "up" | "down";
  redis: "up" | "down";
  timestamp: string;
};
