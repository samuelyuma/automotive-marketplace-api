# Automotive Marketplace API

## Local Development

Copy the example configuration once:

```bash
cp .env.example .env
```

### Docker

```bash
bun run docker:up
```

This starts the API, PostgreSQL 18, and Redis 8. Run the command again after
source changes to rebuild the compiled API. Stop everything with
`bun run docker:down`; database and Redis data remain in Docker volumes.

### Hybrid (Bun for Server, Docker for Database)

```bash
docker compose -f docker-compose.dev.yml up -d postgres redis
bun run dev
```

If the Docker API is running, stop it first with
`docker compose -f docker-compose.dev.yml stop api` to free the API port.
The example `.env` uses `127.0.0.1` for host connections; Compose uses Docker
service names. Change `PORT`, `POSTGRES_PORT`, or `REDIS_PORT` in `.env` if a
host port is occupied.

The API defaults to `http://localhost:8080`. Health status is at
`/health-check`, interactive docs at `/docs`, and OpenAPI JSON at `/docs/json`.

## Migrations

With the development stack running, apply migrations from another terminal:

```bash
bun run migrate:up
```

To revert the latest migration:

```bash
bun run migrate:down
```

Migration files live in `migrations/` as matching `.up.sql` and
`.down.sql` files.
