import postgres from "postgres";

import { env } from "../../main/config/env";
import { logger } from "../logging/logger";

const dbLogger = logger.child({ module: "database" });

export const sql = postgres(env.DATABASE_URL, {
  max: env.NODE_ENV === "production" ? 1 : 10,
  idle_timeout: 20,
  connect_timeout: 10,
  debug: (_connection, query, params) => {
    dbLogger.debug({ query, params }, "query dispatched");
  },
});
