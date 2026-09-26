import { InvalidListingSearchQueryError } from "../../domain/errors/listing-error";

export function assertNoUnknownQueryParams(
  request: Request,
  allowedKeys: ReadonlySet<string>,
): void {
  const unknown = [...new URL(request.url).searchParams.keys()].find(
    (key) => !allowedKeys.has(key),
  );
  if (unknown !== undefined) throw new InvalidListingSearchQueryError(unknown);
}

/** Shared allow-list for the browse-style listing endpoints (GET /listings, GET /categories/:id/listings). */
export const listingBrowseQueryKeys: ReadonlySet<string> = new Set([
  "category_id",
  "make",
  "model",
  "condition",
  "fuel_type",
  "transmission",
  "min_year",
  "max_year",
  "min_price",
  "max_price",
  "min_mileage",
  "max_mileage",
  "location",
  "sort",
  "direction",
  "per_page",
  "cursor",
]);
