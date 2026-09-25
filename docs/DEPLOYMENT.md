# Deploy to Vercel

The root `server.ts` exports the Elysia app for Vercel's Bun runtime. The
existing `src/index.ts`, `bun run dev`, and Docker Compose setup remain the
local entrypoints. `vercel.json` enables Bun 1.x.

## Provision Services

1. Create a Neon database. Copy its **pooled** connection string for API
   requests and its **direct** connection string for migrations. Keep TLS
   parameters supplied by Neon on both URLs.
2. Create an Upstash Redis database. Copy its REST URL and REST token. The
   deployment uses Upstash's HTTP client; local development continues to use
   the TCP `REDIS_URL` from `.env` or Docker Compose.
3. Set these variables in the Vercel project for each deployment environment:

   | Name | Value |
   | --- | --- |
   | `DATABASE_URL` | Neon pooled connection string (`-pooler` host) |
   | `REDIS_BACKEND` | `upstash` |
   | `UPSTASH_REDIS_REST_URL` | Upstash REST URL |
   | `UPSTASH_REDIS_REST_TOKEN` | Upstash REST token |
   | `LOG_LEVEL` | Optional; defaults to `info` |

   Keep preview and production data separate. Vercel supplies `VERCEL`; the
   app refuses to start there unless `REDIS_BACKEND=upstash` and both Upstash
   credentials are present. Do not put service credentials in Git or
   `vercel.json`.

`DATABASE_URL_UNPOOLED` is a direct Neon URL used by the migration command.
Set it only in the trusted environment that runs migrations, alongside
`DATABASE_URL`; the Vercel function does not need it. Local migrations still
use `DATABASE_URL` when `DATABASE_URL_UNPOOLED` is absent.

## Apply Migrations and Deploy

Run migrations once against the target Neon database before directing API
traffic to it:

```bash
bun install --frozen-lockfile
bun run migrate:up
```

Provide `DATABASE_URL` and `DATABASE_URL_UNPOOLED` to that command through
your trusted shell or CI secrets. Do not run migrations at function startup:
concurrent serverless instances can start at the same time. Then deploy the
repository as a Vercel project using the Bun runtime set in `vercel.json`.
The root `server.ts` is the entrypoint; no Docker image is needed on Vercel.

For demo data, run `bun run seed` from a trusted shell after migrations. The
command uses the same direct Neon URL as migrations and creates 500 repeatable
listings across nine vehicle categories in a 10-category tree, along with
their attribute definitions. Do not run it during Vercel function startup.

## Rate Limiting and Checks

Upstash enforces separate per-client-IP sliding windows across all function
instances: 60 GET/HEAD requests per minute and 10 other requests per minute.
An exceeded window returns HTTP 429 with `Retry-After`. If Upstash cannot
make a decision, the API returns HTTP 503 before the route handler touches
Neon. Local TCP mode skips rate limiting and requires no Upstash credentials.

After a preview deployment, check `/docs/json` and `/health-check`, then
exercise one read and one write against test data. Confirm that repeated
requests return 429 with `Retry-After` and that a normal request still
works after the window resets. Verify `bun run dev` and Docker Compose
separately against local services.

Vercel's firewall handles traffic before functions run; application rate
limiting limits requests that reach the API. The write routes intentionally
remain public, so callers can modify data within their quota.

## Verify the Public Deployment

The root README lists the production base URL and links to its API docs. Check
`/health-check`, `/docs`, and `/docs/json` on that public host. Make a read
request against seeded data and confirm that search returns a response without
relying on local services.

Use test data for write checks. Listing and category write routes are public,
so do not send real seller or customer data to this deployment.
