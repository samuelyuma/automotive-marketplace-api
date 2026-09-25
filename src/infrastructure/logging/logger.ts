import { createPinoLogger } from "@bogeychan/elysia-logger";

import { env } from "../../main/config/env";

export const logger = createPinoLogger({
  level: env.LOG_LEVEL,
  messageKey: "message",
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
  serializers: {
    params: () => "[REDACTED]",
    exception: (err: Error) => ({
      type: err.name,
      message: err.message,
      stack: err.stack,
    }),
  },
  transport:
    env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "HH:MM:ss" },
        }
      : undefined,
});
