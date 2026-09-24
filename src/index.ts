import { createServer } from "@main/server";

async function start() {
  try {
    const server = createServer();

    console.log(
      `🚀 Server running at ${server.server?.hostname}:${server.server?.port}`,
    );

    const shutdown = async () => {
      process.exit(0);
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  } catch (error) {
    console.log("🚨 Failed to start server", { error });
    process.exit(1);
  }
}

start();
