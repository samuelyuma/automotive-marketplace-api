import { InvalidListingCursorError } from "../../domain/errors/listing-error";
import { PG_INT32_MAX, PG_UUID_REGEX } from "../../domain/postgres";
import type {
  ListingCursor,
  ListingDirection,
  ListingSort,
} from "../ports/listing-search-repository.port";

// Store the sort order with the row so a cursor cannot be reused for another order.
export function encodeListingCursor(
  sort: ListingSort,
  direction: ListingDirection,
  cursor: ListingCursor,
): string {
  return Buffer.from(
    JSON.stringify({ version: 1, sort, direction, ...cursor }),
  ).toString("base64url");
}

// Validate every decoded field before it reaches the SQL cursor comparison.
export function decodeListingCursor(
  encoded: string | undefined,
  sort: ListingSort,
  direction: ListingDirection,
): ListingCursor | null {
  if (encoded === undefined) return null;
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    );
    if (typeof parsed !== "object" || parsed === null) throw new Error();
    const value = parsed as Record<string, unknown>;
    // The version and sort order must match the request that uses the cursor.
    if (
      value.version !== 1 ||
      value.sort !== sort ||
      value.direction !== direction ||
      typeof value.id !== "string" ||
      !PG_UUID_REGEX.test(value.id) ||
      typeof value.value !== "string"
    )
      throw new Error();

    // Each sort field has a different value type and database range.
    if (sort === "created_at") {
      if (!Number.isFinite(Date.parse(value.value))) throw new Error();
    } else if (sort === "relevance") {
      // Rank is a nonnegative decimal, not arbitrary text cast by PostgreSQL.
      const rank = Number(value.value);
      if (
        value.value.length > 64 ||
        !/^(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(value.value) ||
        !Number.isFinite(rank) ||
        rank < 0 ||
        rank > 1e6
      )
        throw new Error();
    } else {
      // Numeric columns have different bounds, and price must stay JS-safe.
      const numeric = Number(value.value);
      const minimum = sort === "year" ? 1900 : 0;
      const maximum =
        sort === "year"
          ? 2100
          : sort === "mileage"
            ? PG_INT32_MAX
            : Number.MAX_SAFE_INTEGER;
      if (
        !/^\d+$/.test(value.value) ||
        !Number.isSafeInteger(numeric) ||
        numeric < minimum ||
        numeric > maximum
      )
        throw new Error();
    }
    return { id: value.id, value: value.value };
  } catch {
    // Malformed JSON, encoding, and field values share one public error.
    throw new InvalidListingCursorError();
  }
}
