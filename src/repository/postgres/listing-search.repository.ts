import type postgres from "postgres";

import type {
  ListingSearchQuery,
  ListingSearchRepository,
  ListingSearchResult,
  ListingSort,
  ListingSuggestion,
  ListingSuggestionQuery,
} from "../../application/ports/listing-search-repository.port";
import type { Listing } from "../../domain/entities/listing";
import { InvalidListingSearchQueryError } from "../../domain/errors/listing-error";
import { sql } from "../../infrastructure/postgres/client";
import { timedQuery } from "../../infrastructure/postgres/timed-query";
import { categoryScopeIds } from "./category-scope";
import { listingColumns } from "./listing-row";

type ListingRow = Omit<Listing, "price"> & { price: string };
type ListingPageRow = ListingRow & { cursor_value: string };
type SqlFragment = postgres.Fragment;

// Each sort field needs the same SQL type when reading and comparing a cursor.
const sortStrategies: Record<
  ListingSort,
  {
    column: (textQuery: SqlFragment | null) => SqlFragment;
    castCursor: (value: string) => SqlFragment;
  }
> = {
  relevance: {
    column: (textQuery) => sql`ts_rank(search_vector, ${textQuery})`,
    castCursor: (value) => sql`${value}::real`,
  },
  created_at: {
    column: () => sql`created_at`,
    castCursor: (value) => sql`${value}::text::timestamptz`,
  },
  price: {
    column: () => sql`price`,
    castCursor: (value) => sql`${value}::bigint`,
  },
  mileage: {
    column: () => sql`mileage`,
    castCursor: (value) => sql`${value}::integer`,
  },
  year: {
    column: () => sql`year`,
    castCursor: (value) => sql`${value}::smallint`,
  },
};

function toListing(row: ListingRow): Listing {
  return { ...row, price: Number(row.price) };
}

export class PgListingSearchRepository implements ListingSearchRepository {
  async suggest(query: ListingSuggestionQuery): Promise<ListingSuggestion[]> {
    // Escape LIKE wildcards so each keystroke is matched as literal prefix text.
    const pattern = `${query.q.replace(/[!%_]/g, "!$&")}%`;
    const type = query.type ?? null;
    // Merge the three suggestion fields, then remove case-insensitive duplicates.
    return timedQuery(
      "listing.suggest",
      "heavy",
      () => sql<ListingSuggestion[]>`
      -- Gather matching values from each suggestion field.
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
        -- Keep one spelling for values that differ only by case.
        SELECT DISTINCT ON (type, lower(value)) type, value
        FROM raw
        ORDER BY type, lower(value), value
      )
      SELECT type, value
      FROM deduplicated
      ORDER BY CASE type WHEN 'make' THEN 0 WHEN 'model' THEN 1 ELSE 2 END,
               lower(value), value
      LIMIT ${query.limit}
    `,
    );
  }

  // Reuse the search filters for both the page and its make facet counts.
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
      -- Shared by the listing page and make facets.
      -- A null input disables its predicate; casts keep PostgreSQL types explicit.
      status = 'AVAILABLE'
      ${textQuery ? sql`AND search_vector @@ ${textQuery}` : sql``}
      AND (${query.category_id ?? null}::uuid IS NULL OR category_id = ${query.category_id ?? null}::uuid)
      -- Category pages include descendants; direct category filters do not.
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
    /* Keep make out of the shared filters so its facet counts include other
       makes that match the rest of the query. */
    const makeFilter = sql`AND (${query.make ?? null}::text IS NULL OR lower(make) = lower(${query.make ?? null}::text))`;

    const strategy = sortStrategies[query.sort];
    const sortColumn = strategy.column(textQuery);
    const sortDirection = query.direction === "asc" ? sql`ASC` : sql`DESC`;
    const comparator = query.direction === "asc" ? sql`>` : sql`<`;
    const cursorValue = query.cursor
      ? strategy.castCursor(query.cursor.value)
      : null;
    // Compare the sort field and ID together so equal values page correctly.
    const cursorFilter = query.cursor
      ? sql`AND (${sortColumn}, id) ${comparator} (${cursorValue}, ${query.cursor.id}::uuid)`
      : sql``;

    // One extra row tells the caller whether another page exists.
    const [rows, facetRows] = await timedQuery("listing.list", "heavy", () =>
      Promise.all([
        sql<ListingPageRow[]>`
        SELECT ${listingColumns},
               -- Use the SQL sort value exactly as returned to build the next cursor.
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
            -- The shared filters omit make so every matching make gets a count.
            SELECT make AS value, count(*)::integer AS count
            FROM vehicle_listings
            WHERE ${filters}
            GROUP BY make
            ORDER BY count DESC, value ASC
          `,
      ]),
    );

    return {
      rows: rows.map(({ cursor_value, ...row }) => ({
        listing: toListing(row),
        cursor_value,
      })),
      facets: { make: facetRows },
    };
  }
}
