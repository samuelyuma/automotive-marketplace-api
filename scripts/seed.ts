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

  const [row] = await sql<{ listings: number; categories: number; attributes: number }[]>`
    SELECT
      (SELECT count(*)::integer FROM vehicle_listings WHERE id IN (
        SELECT md5('automotive-demo-listing-' || n::text)::uuid
        FROM generate_series(1, 500) AS n
      )) AS listings,
      (SELECT count(*)::integer FROM categories WHERE slug IN (
        'demo-cars', 'demo-sedans', 'demo-suvs', 'demo-hatchbacks', 'demo-mpvs',
        'demo-coupes', 'demo-pickups', 'demo-vans', 'demo-wagons', 'demo-crossovers'
      )) AS categories,
      (SELECT count(*)::integer FROM attribute_definitions AS attribute
        JOIN categories AS category ON category.id = attribute.category_id
        WHERE category.slug IN (
          'demo-cars', 'demo-sedans', 'demo-suvs', 'demo-hatchbacks', 'demo-mpvs',
          'demo-coupes', 'demo-pickups', 'demo-vans', 'demo-wagons', 'demo-crossovers'
        ) AND attribute.deleted_at IS NULL
      ) AS attributes
  `;
  if (!row) throw new Error("Seed count query returned no row");
  console.log(`Demo seed present: ${row.listings}/500 listings, ${row.categories}/10 categories, ${row.attributes} active attributes`);
} finally {
  await sql.end();
}
