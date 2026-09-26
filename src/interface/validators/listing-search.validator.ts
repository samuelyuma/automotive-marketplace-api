import Elysia, { t } from "elysia";

import {
  listingListItemSchema,
  listingMileageQuerySchema,
  listingPriceQuerySchema,
  listingYearQuerySchema,
} from "./listing/list-listings.validator";
import {
  conditionSchema,
  fuelTypeSchema,
  transmissionSchema,
} from "./listing/listing-fields.validator";
import {
  badRequestSchema,
  internalErrorSchema,
  paginationMetaSchema,
  successSchema,
} from "./response.validator";
import { databaseUuidSchema } from "./uuid.validator";

export const SearchListingsModel = new Elysia().model({
  "listing.search.query": t.Object(
    {
      q: t.Optional(t.String({ maxLength: 200 })),
      category_id: t.Optional(databaseUuidSchema),
      make: t.Optional(t.String({ minLength: 1 })),
      model: t.Optional(t.String({ minLength: 1 })),
      condition: t.Optional(conditionSchema),
      fuel_type: t.Optional(fuelTypeSchema),
      transmission: t.Optional(transmissionSchema),
      min_price: t.Optional(listingPriceQuerySchema),
      max_price: t.Optional(listingPriceQuerySchema),
      min_year: t.Optional(listingYearQuerySchema),
      max_year: t.Optional(listingYearQuerySchema),
      min_mileage: t.Optional(listingMileageQuerySchema),
      max_mileage: t.Optional(listingMileageQuerySchema),
      location: t.Optional(t.String({ minLength: 1 })),
      sort: t.Optional(
        t.Union([
          t.Literal("relevance"),
          t.Literal("created_at"),
          t.Literal("price"),
          t.Literal("year"),
          t.Literal("mileage"),
        ]),
      ),
      direction: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
      per_page: t.Optional(
        t.Numeric({ minimum: 1, maximum: 100, multipleOf: 1 }),
      ),
      cursor: t.Optional(t.String({ minLength: 1, maxLength: 512 })),
    },
    { additionalProperties: false },
  ),
  "listing.search": t.Intersect([
    successSchema(t.Array(listingListItemSchema)),
    t.Object({ meta: paginationMetaSchema }),
  ]),
  "listing.search.bad_request": badRequestSchema,
  "listing.search.internal_error": internalErrorSchema,
});

export const searchListingsRouteDetail = {
  summary: "Search Listings",
  description:
    "Searches available listings with full-text terms and structured filters. Uses cursor pagination and separate sort/direction parameters; defaults to relevance for a search term and newest otherwise.",
  tags: ["Search & Filters"],
};
