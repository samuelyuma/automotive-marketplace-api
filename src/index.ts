import { logger } from "@infrastructure/logging/logger";
import { sql } from "@infrastructure/postgres/client";
import { redis } from "@infrastructure/redis/client";

import { initDependencies } from "@main/dependencies";
import { createServer } from "@main/server";

async function start() {
  await initDependencies();

  try {
    const server = createServer();
    logger.info(
      { hostname: server.server?.hostname, port: server.server?.port },
      "🚀 Server running",
    );

    const shutdown = async () => {
      logger.info({}, "shutting down");
      await sql.end();
      await redis.quit();
      process.exit(0);
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  } catch (error) {
    logger.error({ exception: error }, "🚨 Failed to start server");
    process.exit(1);
  }
}

start();
