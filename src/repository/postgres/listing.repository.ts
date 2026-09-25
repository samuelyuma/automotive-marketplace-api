import postgres from "postgres";

import type {
  ListingRepository,
  ListingSearchQuery,
  ListingSearchResult,
  ListingSuggestion,
  ListingSuggestionQuery,
} from "@application/ports/listing-repository.port";
import { InvalidListingSearchQueryError } from "@application/utils/listing-search";

import type {
  Listing,
  NewListing,
  SoftDeletedListing,
  UpdateListing,
} from "@domain/entities/listing";
import { ListingCategoryNotFoundError } from "@domain/errors/listing-error";

import { sql } from "@infrastructure/postgres/client";

import { categoryScopeIds } from "./category-scope";

type ListingRow = Omit<Listing, "price"> & { price: string };
type ListingPageRow = ListingRow & { cursor_value: string };

function toListing(row: ListingRow): Listing {
  return { ...row, price: Number(row.price) };
}

function throwListingError(error: unknown): never {
  if (
    error instanceof postgres.PostgresError &&
    error.code === "23503" &&
    error.constraint_name === "vehicle_listings_category_id_fkey"
  )
    throw new ListingCategoryNotFoundError();
  throw error;
}

export class PgListingRepository implements ListingRepository {
  async suggest(query: ListingSuggestionQuery): Promise<ListingSuggestion[]> {
    // Escape LIKE wildcards so each keystroke is matched as literal prefix text.
    const pattern = `${query.q.replace(/[!%_]/g, "!$&")}%`;
    const type = query.type ?? null;
    return sql<ListingSuggestion[]>`
      WITH raw AS (
        SELECT 'make'::text AS type, make AS value
        FROM vehicle_listings
        WHERE status = 'AVAILABLE'
          AND (${type}::text IS NULL OR ${type}::text = 'make')
          AND lower(make) LIKE lower(${pattern}) ESCAPE '!'
        UNION ALL
        SELECT 'model'::text AS type, model AS value
        FROM vehicle_listings
        WHERE status = 'AVAILABLE'
          AND (${type}::text IS NULL OR ${type}::text = 'model')
          AND lower(model) LIKE lower(${pattern}) ESCAPE '!'
        UNION ALL
        SELECT 'location'::text AS type, location AS value
        FROM vehicle_listings
        WHERE status = 'AVAILABLE'
          AND (${type}::text IS NULL OR ${type}::text = 'location')
          AND lower(location) LIKE lower(${pattern}) ESCAPE '!'
      ), deduplicated AS (
        SELECT DISTINCT ON (type, lower(value)) type, value
        FROM raw
        ORDER BY type, lower(value), value
      )
      SELECT type, value
      FROM deduplicated
      ORDER BY CASE type WHEN 'make' THEN 0 WHEN 'model' THEN 1 ELSE 2 END,
               lower(value), value
      LIMIT ${query.limit}
    `;
  }

  async getById(id: string): Promise<Listing | null> {
    const [listing] = await sql<ListingRow[]>`
      SELECT id, category_id, make, model, year, price, mileage,
             condition, color, location, status, image_url, fuel_type,
             transmission, engine_cc, created_at, updated_at
      FROM vehicle_listings
      WHERE id = ${id} AND status <> 'REMOVED'
    `;
    return listing ? toListing(listing) : null;
  }

  async list(query: ListingSearchQuery): Promise<ListingSearchResult> {
    const textQuery = query.q
      ? sql`websearch_to_tsquery('simple', ${query.q})`
      : null;
    if (query.sort === "relevance" && !textQuery)
      throw new InvalidListingSearchQueryError(
        "sort",
        "Relevance sorting requires a search term",
      );
    const filters = sql`
      status = 'AVAILABLE'
      ${textQuery ? sql`AND search_vector @@ ${textQuery}` : sql``}
      AND (${query.category_id ?? null}::uuid IS NULL OR category_id = ${query.category_id ?? null}::uuid)
      ${query.scope_category_id ? sql`AND category_id IN (${categoryScopeIds(query.scope_category_id)})` : sql``}
      AND (${query.model ?? null}::text IS NULL OR lower(model) = lower(${query.model ?? null}::text))
      AND (${query.condition ?? null}::listing_conditions IS NULL OR condition = ${query.condition ?? null}::listing_conditions)
      AND (${query.fuel_type ?? null}::fuel_types IS NULL OR fuel_type = ${query.fuel_type ?? null}::fuel_types)
      AND (${query.transmission ?? null}::transmissions IS NULL OR transmission = ${query.transmission ?? null}::transmissions)
      AND (${query.min_year ?? null}::smallint IS NULL OR year >= ${query.min_year ?? null}::smallint)
      AND (${query.max_year ?? null}::smallint IS NULL OR year <= ${query.max_year ?? null}::smallint)
      AND (${query.min_price ?? null}::bigint IS NULL OR price >= ${query.min_price ?? null}::bigint)
      AND (${query.max_price ?? null}::bigint IS NULL OR price <= ${query.max_price ?? null}::bigint)
      AND (${query.min_mileage ?? null}::integer IS NULL OR mileage >= ${query.min_mileage ?? null}::integer)
      AND (${query.max_mileage ?? null}::integer IS NULL OR mileage <= ${query.max_mileage ?? null}::integer)
      AND (${query.location ?? null}::text IS NULL OR lower(location) = lower(${query.location ?? null}::text))
    `;
    const makeFilter = sql`AND (${query.make ?? null}::text IS NULL OR lower(make) = lower(${query.make ?? null}::text))`;

    const sortColumn =
      query.sort === "relevance"
        ? sql`ts_rank(search_vector, ${textQuery})`
        : query.sort === "created_at"
          ? sql`created_at`
          : query.sort === "price"
            ? sql`price`
            : query.sort === "mileage"
              ? sql`mileage`
              : sql`year`;
    const sortDirection = query.direction === "asc" ? sql`ASC` : sql`DESC`;
    const comparator = query.direction === "asc" ? sql`>` : sql`<`;
    // Bind timestamps as text so Postgres.js preserves microseconds in the cursor.
    const cursorValue = query.cursor
      ? query.sort === "created_at"
        ? sql`${query.cursor.value}::text::timestamptz`
        : query.sort === "relevance"
          ? sql`${query.cursor.value}::real`
          : query.sort === "price"
            ? sql`${query.cursor.value}::bigint`
            : query.sort === "mileage"
              ? sql`${query.cursor.value}::integer`
              : sql`${query.cursor.value}::smallint`
      : null;
    const cursorFilter = query.cursor
      ? sql`AND (${sortColumn}, id) ${comparator} (${cursorValue}, ${query.cursor.id}::uuid)`
      : sql``;

    const [rows, facetRows] = await Promise.all([
      sql<ListingPageRow[]>`
        SELECT id, category_id, make, model, year, price, mileage,
               condition, color, location, status, image_url, fuel_type,
               transmission, engine_cc, created_at, updated_at,
               ${sortColumn}::text AS cursor_value
        FROM vehicle_listings
        WHERE ${filters}
          ${makeFilter}
          ${cursorFilter}
        ORDER BY ${sortColumn} ${sortDirection}, id ${sortDirection}
        LIMIT ${query.per_page + 1}
      `,
      query.include_facets === false
        ? Promise.resolve([])
        : sql<{ value: string; count: number }[]>`
            SELECT make AS value, count(*)::integer AS count
            FROM vehicle_listings
            WHERE ${filters}
            GROUP BY make
            ORDER BY count DESC, value ASC
          `,
    ]);

    return {
      rows: rows.map(({ cursor_value, ...row }) => ({
        listing: toListing(row),
        cursor_value,
      })),
      facets: { make: facetRows },
    };
  }

  async create(data: NewListing): Promise<Listing> {
    try {
      const [listing] = await sql<ListingRow[]>`
        INSERT INTO vehicle_listings (
          category_id, make, model, year, price, mileage, condition,
          color, location, image_url, fuel_type, transmission, engine_cc
        ) VALUES (
          ${data.category_id}, ${data.make}, ${data.model}, ${data.year},
          ${data.price}, ${data.mileage}, ${data.condition}, ${data.color},
          ${data.location}, ${data.image_url ?? null}, ${data.fuel_type ?? null},
          ${data.transmission ?? null}, ${data.engine_cc ?? null}
        )
        RETURNING id, category_id, make, model, year, price, mileage,
                  condition, color, location, status, image_url, fuel_type,
                  transmission, engine_cc, created_at, updated_at
      `;
      if (!listing) throw new Error("Listing insert returned no row");
      return toListing(listing);
    } catch (error) {
      throwListingError(error);
    }
  }

  async update(id: string, data: UpdateListing): Promise<Listing | null> {
    try {
      const [listing] = await sql<ListingRow[]>`
        UPDATE vehicle_listings
        SET category_id = COALESCE(${data.category_id ?? null}::uuid, category_id),
            make = COALESCE(${data.make ?? null}, make),
            model = COALESCE(${data.model ?? null}, model),
            year = COALESCE(${data.year ?? null}::smallint, year),
            price = COALESCE(${data.price ?? null}::bigint, price),
            mileage = COALESCE(${data.mileage ?? null}::integer, mileage),
            condition = COALESCE(${data.condition ?? null}::listing_conditions, condition),
            color = COALESCE(${data.color ?? null}, color),
            location = COALESCE(${data.location ?? null}, location),
            status = COALESCE(${data.status ?? null}::listing_statuses, status),
            image_url = CASE WHEN ${data.image_url !== undefined} THEN ${data.image_url ?? null} ELSE image_url END,
            fuel_type = CASE WHEN ${data.fuel_type !== undefined} THEN ${data.fuel_type ?? null}::fuel_types ELSE fuel_type END,
            transmission = CASE WHEN ${data.transmission !== undefined} THEN ${data.transmission ?? null}::transmissions ELSE transmission END,
            engine_cc = CASE WHEN ${data.engine_cc !== undefined} THEN ${data.engine_cc ?? null}::integer ELSE engine_cc END,
            updated_at = now()
        WHERE id = ${id} AND status <> 'REMOVED'
        RETURNING id, category_id, make, model, year, price, mileage,
                  condition, color, location, status, image_url, fuel_type,
                  transmission, engine_cc, created_at, updated_at
      `;
      return listing ? toListing(listing) : null;
    } catch (error) {
      throwListingError(error);
    }
  }

  async softDelete(id: string): Promise<SoftDeletedListing | null> {
    const [listing] = await sql<SoftDeletedListing[]>`
      UPDATE vehicle_listings
      SET status = 'REMOVED', updated_at = now()
      WHERE id = ${id} AND status <> 'REMOVED'
      RETURNING id, status, updated_at
    `;
    return listing ?? null;
  }
}
