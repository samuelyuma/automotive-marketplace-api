import { join } from "node:path";
import { Glob } from "bun";

import postgres from "postgres";

import { env } from "../../main/config/env";

export function migrationConnectionUrl(config: {
  DATABASE_URL: string;
  DATABASE_URL_UNPOOLED?: string;
}) {
  return config.DATABASE_URL_UNPOOLED ?? config.DATABASE_URL;
}

const sql = postgres(migrationConnectionUrl(env));

const MIGRATIONS_DIR = join(import.meta.dir, "../../../migrations");

async function ensureMigrationsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
}

export async function up() {
  await ensureMigrationsTable();

  const applied = new Set(
    (await sql`SELECT name FROM _migrations`).map((r) => r.name),
  );
  const files = [...new Glob("*.up.sql").scanSync(MIGRATIONS_DIR)].sort();

  for (const file of files) {
    if (applied.has(file)) continue;

    console.log(`applying ${file}...`);

    const migration = await Bun.file(join(MIGRATIONS_DIR, file)).text();

    await sql.begin(async (tx) => {
      await tx.unsafe(migration).simple();
      await tx`INSERT INTO _migrations (name) VALUES (${file})`;
    });

    console.log(`✓ applied ${file}`);
  }
}

export async function down(steps = 1) {
  await ensureMigrationsTable();

  const applied =
    await sql`SELECT name FROM _migrations ORDER BY applied_at DESC, name DESC LIMIT ${steps}`;

  for (const { name } of applied) {
    const downFile = name.replace(/\.up\.sql$/, ".down.sql");

    console.log(`reverting ${name}...`);

    const migration = await Bun.file(join(MIGRATIONS_DIR, downFile)).text();

    await sql.begin(async (tx) => {
      await tx.unsafe(migration).simple();
      await tx`DELETE FROM _migrations WHERE name = ${name}`;
    });

    console.log(`✓ reverted ${name}`);
  }
}

if (import.meta.main) {
  try {
    const command = process.argv[2];
    if (command === "up") {
      await up();
    } else if (command === "down") {
      const steps = Number(process.argv[3] ?? 1);

      if (!Number.isSafeInteger(steps) || steps < 1) {
        throw new Error("✗ Migration steps must be a positive integer");
      }

      await down(steps);
    } else {
      throw new Error(
        "Usage: bun src/infrastructure/database/migrate.ts <up|down> [steps]",
      );
    }
  } finally {
    await sql.end();
  }
}
