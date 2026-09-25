import { join } from "node:path";
import postgres from "postgres";

const connectionString =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Set DATABASE_URL_UNPOOLED or DATABASE_URL before seeding");
}

const sql = postgres(connectionString, { max: 1 });

try {
  const seed = await Bun.file(join(import.meta.dir, "seed.sql")).text();
  await sql.unsafe(seed).simple();

  const [row] = await sql<{ count: number }[]>`
    SELECT count(*)::integer AS count
    FROM vehicle_listings
    WHERE id IN (
      SELECT md5('automotive-demo-listing-' || n::text)::uuid
      FROM generate_series(1, 500) AS n
    )
  `;
  if (!row) throw new Error("Seed count query returned no row");
  console.log(`Demo listings present: ${row.count}/500`);
} finally {
  await sql.end();
}
