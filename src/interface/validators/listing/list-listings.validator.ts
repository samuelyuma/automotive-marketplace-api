import Elysia, { t } from "elysia";

import {
  badRequestSchema,
  internalErrorSchema,
  paginatedSuccessSchema,
} from "../response.validator";
import {
  conditionSchema,
  fuelTypeSchema,
  listingResponseFields,
  transmissionSchema,
} from "./listing-fields.validator";

const yearSchema = t.Numeric({ minimum: 1900, maximum: 2100, multipleOf: 1 });
const priceSchema = t.Numeric({
  minimum: 0,
  maximum: Number.MAX_SAFE_INTEGER,
  multipleOf: 1,
});
const mileageSchema = t.Numeric({
  minimum: 0,
  maximum: 2147483647,
  multipleOf: 1,
});

export const ListListingsModel = new Elysia().model({
  "listing.list.query": t.Object(
    {
      category_id: t.Optional(t.String({ format: "uuid" })),
      make: t.Optional(t.String({ minLength: 1 })),
      model: t.Optional(t.String({ minLength: 1 })),
      condition: t.Optional(conditionSchema),
      fuel_type: t.Optional(fuelTypeSchema),
      transmission: t.Optional(transmissionSchema),
      min_year: t.Optional(yearSchema),
      max_year: t.Optional(yearSchema),
      min_price: t.Optional(priceSchema),
      max_price: t.Optional(priceSchema),
      min_mileage: t.Optional(mileageSchema),
      max_mileage: t.Optional(mileageSchema),
      location: t.Optional(t.String({ minLength: 1 })),
      sort: t.Optional(
        t.Union([
          t.Literal("created_at"),
          t.Literal("price"),
          t.Literal("mileage"),
          t.Literal("year"),
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
  "listing.list": paginatedSuccessSchema(
    t.Array(
      t.Object({
        ...listingResponseFields,
        created_at: t.String({ format: "date-time" }),
        updated_at: t.String({ format: "date-time" }),
      }),
    ),
    t.Object({
      make: t.Array(
        t.Object({ value: t.String(), count: t.Integer({ minimum: 0 }) }),
      ),
    }),
  ),
  "listing.list.bad_request": badRequestSchema,
  "listing.list.internal_error": internalErrorSchema,
});

export const listListingsRouteDetail = {
  summary: "Browse Listings",
  description:
    "Returns available listings with filters, make facets, and cursor pagination. Use sort=created_at|price|mileage|year and direction=asc|desc.",
  tags: ["Listing"],
};

export const listCategoryListingsRouteDetail = {
  summary: "Browse Category Listings",
  description:
    "Returns available listings in this category and all its subcategories, with the same filters, sort, facets, and cursor pagination as GET /listings.",
  tags: ["Category", "Listing"],
};
