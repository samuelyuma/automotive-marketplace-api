import Elysia, { t } from "elysia";

import {
  badRequestSchema,
  internalErrorSchema,
  paginationMetaSchema,
  successSchema,
} from "../response.validator";
import {
  listingListItemSchema,
  listingMileageQuerySchema,
  listingPriceQuerySchema,
  listingYearQuerySchema,
} from "./list-listings.validator";
import {
  conditionSchema,
  fuelTypeSchema,
  transmissionSchema,
} from "./listing-fields.validator";

export const SearchListingsModel = new Elysia().model({
  "listing.search.query": t.Object(
    {
      q: t.Optional(t.String({ maxLength: 200 })),
      category_id: t.Optional(t.String({ format: "uuid" })),
      make: t.Optional(t.String({ minLength: 1 })),
      model: t.Optional(t.String({ minLength: 1 })),
      condition: t.Optional(conditionSchema),
      fuel_type: t.Optional(fuelTypeSchema),
      transmission: t.Optional(transmissionSchema),
      price_min: t.Optional(listingPriceQuerySchema),
      price_max: t.Optional(listingPriceQuerySchema),
      year_min: t.Optional(listingYearQuerySchema),
      year_max: t.Optional(listingYearQuerySchema),
      mileage_min: t.Optional(listingMileageQuerySchema),
      mileage_max: t.Optional(listingMileageQuerySchema),
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
      cursor: t.Optional(t.String({ minLength: 1 })),
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
  tags: ["Listing"],
};
