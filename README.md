# Automotive Marketplace API

## Local development

Copy the development configuration and start the API, PostgreSQL 18, and
Redis 8:

```bash
cp .env.example .env
docker compose -f docker-compose.dev.yml up --build
```

The API is available at `http://localhost:8080` by default. It runs in Bun
watch mode with `src/` mounted into the container, so source changes do not
require an image rebuild.

If port 8080 is in use, change `PORT` in `.env` before starting Compose. This
changes both the API's listening port and its published host port. If ports
5432 or 6379 are occupied, change `POSTGRES_PORT` or `REDIS_PORT` in `.env`.
These change only the host ports; the API still connects to `postgres:5432`
and `redis:6379` on the Compose network.

Keep `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` consistent with
`DATABASE_URL`. PostgreSQL uses them only when it first initializes its named
volume; changing them later does not update existing roles or databases.

Check the API and its dependencies at `http://localhost:8080/health-check` (or
the port set in `.env`). The response reports `db` and `redis` as `up` or
`down`. It returns HTTP 503 when either dependency is down, so Docker marks
the API unhealthy.

Stop the stack with:

```bash
docker compose -f docker-compose.dev.yml down
```

The PostgreSQL and Redis named volumes retain data when the stack is stopped.

## Migrations

With the development stack running, apply migrations from another terminal:

```bash
docker compose -f docker-compose.dev.yml exec api bun run migrate:up
```

To revert the latest migration:

```bash
docker compose -f docker-compose.dev.yml exec api bun run migrate:down
```

Migration files live in `migrations/` as matching `.up.sql` and
`.down.sql` files.
