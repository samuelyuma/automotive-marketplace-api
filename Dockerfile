ARG BUN_VERSION=1.3.13

FROM oven/bun:${BUN_VERSION} AS base
WORKDIR /app

FROM base AS dependencies
COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --ignore-scripts

FROM base AS development
ENV NODE_ENV=development
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json bun.lock tsconfig.json ./
USER bun
EXPOSE 8080

FROM dependencies AS build
ENV NODE_ENV=production
COPY tsconfig.json ./
COPY src ./src
RUN bun build --compile --minify-whitespace --minify-syntax \
    --target=bun --outfile /app/server src/index.ts

FROM oven/bun:${BUN_VERSION}-slim AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=bun:bun /app/server ./server
USER bun
EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=3 \
  CMD ["bun", "-e", "const r = await fetch('http://127.0.0.1:' + (process.env.PORT ?? 8080) + '/health-check'); if (!r.ok) process.exit(1);"]

CMD ["./server"]
