ARG BUN_VERSION=1.3.13

FROM oven/bun:${BUN_VERSION} AS base

WORKDIR /app

FROM base AS dependencies

COPY package.json bun.lock ./

RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --ignore-scripts

FROM dependencies AS build

ENV NODE_ENV=production

COPY tsconfig.json ./
COPY src ./src

RUN bun build --compile --minify-whitespace --minify-syntax \
    --target=bun --outfile /app/server src/index.ts

FROM dependencies AS development

ENV NODE_ENV=production

COPY --from=build --chown=bun:bun /app/server ./server
COPY tsconfig.json ./

USER bun
EXPOSE 8080

CMD ["./server"]

FROM oven/bun:${BUN_VERSION}-slim AS production

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build --chown=bun:bun /app/server ./server

USER bun
EXPOSE 8080

CMD ["./server"]
