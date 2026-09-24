import type {
  CategoryFilterRepository,
  CategoryFilterStats,
  FilterCount,
} from "@application/ports/category-filter-repository.port";

import { sql } from "@infrastructure/postgres/client";

import { categoryScopeIds } from "./category-scope";

type StatsRow = {
  condition: FilterCount[];
  fuel_type: FilterCount[];
  transmission: FilterCount[];
  price_min: string | null;
  price_max: string | null;
  year_min: number | null;
  year_max: number | null;
  mileage_min: number | null;
  mileage_max: number | null;
  engine_cc_min: number | null;
  engine_cc_max: number | null;
};

export class PgCategoryFilterRepository implements CategoryFilterRepository {
  async getForCategory(categoryId: string): Promise<CategoryFilterStats> {
    const [row] = await sql<StatsRow[]>`
      WITH available AS (
        SELECT condition, fuel_type, transmission, price, year, mileage, engine_cc
        FROM vehicle_listings
        WHERE status = 'AVAILABLE'
          AND category_id IN (${categoryScopeIds(categoryId)})
      )
      SELECT
        COALESCE((SELECT jsonb_agg(to_jsonb(c)) FROM (
          SELECT condition::text AS value, count(*)::integer AS count
          FROM available GROUP BY condition
        ) c), '[]'::jsonb) AS condition,
        COALESCE((SELECT jsonb_agg(to_jsonb(f)) FROM (
          SELECT fuel_type::text AS value, count(*)::integer AS count
          FROM available WHERE fuel_type IS NOT NULL GROUP BY fuel_type
        ) f), '[]'::jsonb) AS fuel_type,
        COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM (
          SELECT transmission::text AS value, count(*)::integer AS count
          FROM available WHERE transmission IS NOT NULL GROUP BY transmission
        ) t), '[]'::jsonb) AS transmission,
        (SELECT min(price)::text FROM available) AS price_min,
        (SELECT max(price)::text FROM available) AS price_max,
        (SELECT min(year) FROM available) AS year_min,
        (SELECT max(year) FROM available) AS year_max,
        (SELECT min(mileage) FROM available) AS mileage_min,
        (SELECT max(mileage) FROM available) AS mileage_max,
        (SELECT min(engine_cc) FROM available) AS engine_cc_min,
        (SELECT max(engine_cc) FROM available) AS engine_cc_max
    `;
    if (!row) throw new Error("Category filter query returned no row");
    return {
      condition: row.condition,
      fuel_type: row.fuel_type,
      transmission: row.transmission,
      price: {
        min: row.price_min === null ? null : Number(row.price_min),
        max: row.price_max === null ? null : Number(row.price_max),
      },
      year: { min: row.year_min, max: row.year_max },
      mileage: { min: row.mileage_min, max: row.mileage_max },
      engine_cc: { min: row.engine_cc_min, max: row.engine_cc_max },
    };
  }
}
