import { env } from "../../main/config/env";

// Single branch point for Redis backend selection. Every consumer imports
// this flag instead of re-testing env, so adding a backend touches one file.
export const isUpstashBackend = env.REDIS_BACKEND === "upstash";
