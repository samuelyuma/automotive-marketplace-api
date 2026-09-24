import { Elysia } from "elysia";

export const healthController = new Elysia().get("/health-check", async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});
