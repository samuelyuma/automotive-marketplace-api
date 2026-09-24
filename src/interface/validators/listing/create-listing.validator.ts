import Elysia, { t } from "elysia";

import { ListingCategoryNotFoundError } from "@domain/errors/listing-error";

import {
  badRequestSchema,
  errorSchema,
  internalErrorSchema,
  successSchema,
} from "../response.validator";

const conditionSchema = t.Union([
  t.Literal("NEW"),
  t.Literal("USED"),
  t.Literal("CERTIFIED"),
]);
const fuelTypeSchema = t.Union([
  t.Literal("PETROL"),
  t.Literal("DIESEL"),
  t.Literal("HYBRID"),
  t.Literal("ELECTRIC"),
]);
const transmissionSchema = t.Union([
  t.Literal("MANUAL"),
  t.Literal("AUTOMATIC"),
]);

const listingFields = {
  category_id: t.String({ format: "uuid" }),
  make: t.String({ minLength: 1 }),
  model: t.String({ minLength: 1 }),
  year: t.Integer({ minimum: 1900, maximum: 2100 }),
  price: t.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }),
  mileage: t.Integer({ minimum: 0, maximum: 2147483647 }),
  condition: conditionSchema,
  color: t.String({ minLength: 1 }),
  location: t.String({ minLength: 1 }),
};

export const CreateListingModel = new Elysia().model({
  "listing.create.body": t.Object(
    {
      ...listingFields,
      image_url: t.Optional(t.Nullable(t.String())),
      fuel_type: t.Optional(t.Nullable(fuelTypeSchema)),
      transmission: t.Optional(t.Nullable(transmissionSchema)),
      engine_cc: t.Optional(
        t.Nullable(t.Integer({ minimum: 0, maximum: 2147483647 })),
      ),
    },
    { additionalProperties: false },
  ),
  "listing.created": successSchema(
    t.Object({
      id: t.String({ format: "uuid" }),
      ...listingFields,
      status: t.Union([
        t.Literal("AVAILABLE"),
        t.Literal("PENDING"),
        t.Literal("SOLD"),
        t.Literal("REMOVED"),
      ]),
      image_url: t.Nullable(t.String()),
      fuel_type: t.Nullable(fuelTypeSchema),
      transmission: t.Nullable(transmissionSchema),
      engine_cc: t.Nullable(t.Integer()),
      created_at: t.String({ format: "date-time" }),
    }),
  ),
  "listing.bad_request": badRequestSchema,
  "listing.category_not_found": errorSchema(new ListingCategoryNotFoundError()),
  "listing.internal_error": internalErrorSchema,
});

export const createListingRouteDetail = {
  summary: "Create a New Listing",
  description: "Creates a vehicle listing in an existing category.",
  tags: ["Listing"],
};
