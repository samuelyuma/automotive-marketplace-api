import type {
  AttributeFilterStats,
  FilterCount,
  FilterRepository,
  FilterStats,
} from "../../application/ports/filter-repository.port";
import { sql } from "../../infrastructure/postgres/client";
import { timedQuery } from "../../infrastructure/postgres/timed-query";
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

type AttributeStatsRow = {
  id: string;
  type: "ENUM" | "RANGE" | "BOOLEAN";
  value_text: string | null;
  value_bool: boolean | null;
  count: number;
  range_min: string | null;
  range_max: string | null;
};

export class PgFilterRepository implements FilterRepository {
  getGlobal(): Promise<FilterStats> {
    return this.getStats(null);
  }

  getForCategory(categoryId: string): Promise<FilterStats> {
    return this.getStats(categoryId);
  }

  // Fixed filters cover the subtree; custom values belong to this category.
  private async getStats(categoryId: string | null): Promise<FilterStats> {
    return timedQuery("filter.getStats", "heavy", async () => {
      const [row] = await sql<StatsRow[]>`
      -- Gather available listings once for all fixed filter statistics.
      WITH available AS MATERIALIZED (
        SELECT condition, fuel_type, transmission, price, year, mileage, engine_cc
        FROM vehicle_listings
        WHERE status = 'AVAILABLE'
          ${categoryId ? sql`AND category_id IN (${categoryScopeIds(categoryId)})` : sql``}
      )
      SELECT
        -- Each fixed enum field gets its own value/count list.
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
      const attributes: Record<string, AttributeFilterStats> = {};
      if (categoryId) {
        // Count values from available listings under their own active definition.
        const rows = await sql<AttributeStatsRow[]>`
          -- Group by value for ENUM/BOOLEAN counts; RANGE uses min and max.
          SELECT d.id, d.type, v.value_text, v.value_bool,
                 count(*)::integer AS count,
                 min(v.value_number)::text AS range_min,
                 max(v.value_number)::text AS range_max
          FROM attribute_definitions d
          JOIN listing_attribute_values v ON v.attribute_definition_id = d.id
          JOIN vehicle_listings l ON l.id = v.listing_id
          WHERE d.category_id = ${categoryId}
            AND d.deleted_at IS NULL
            -- Ignore stale values from another category or unavailable listing.
            AND l.category_id = d.category_id
            AND l.status = 'AVAILABLE'
          GROUP BY d.id, d.type, v.value_text, v.value_bool
        `;
        // ENUM and BOOLEAN rows hold counts; RANGE rows hold numeric bounds.
        for (const item of rows) {
          const stats = attributes[item.id] ?? {};
          attributes[item.id] = stats;
          if (item.type === "ENUM" && item.value_text !== null) {
            if (!stats.counts) stats.counts = [];
            stats.counts.push({ value: item.value_text, count: item.count });
          }
          if (item.type === "RANGE")
            stats.range = {
              min: item.range_min === null ? null : Number(item.range_min),
              max: item.range_max === null ? null : Number(item.range_max),
            };
          if (item.type === "BOOLEAN" && item.value_bool !== null) {
            if (item.value_bool) stats.true_count = item.count;
            else stats.false_count = item.count;
          }
        }
      }
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
        attributes,
      };
    });
  }
}
