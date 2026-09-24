import postgres from "postgres";

import { logger } from "@infrastructure/logging/logger";

import { env } from "@main/config/env";

const dbLogger = logger.child({ module: "database" });

export const sql = postgres(env.DATABASE_URL, {
  debug: (_connection, query, params) => {
    dbLogger.debug({ query, params }, "query dispatched");
  },
});
