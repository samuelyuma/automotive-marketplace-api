import postgres from "postgres";

import { env } from "../../main/config/env";
import { logger } from "../logging/logger";

const dbLogger = logger.child({ module: "database" });

export const sql = postgres(env.DATABASE_URL, {
  debug: (_connection, query, params) => {
    dbLogger.debug({ query, params }, "query dispatched");
  },
});
