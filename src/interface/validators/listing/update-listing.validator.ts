import Elysia, { t } from "elysia";

import {
  ListingCategoryNotFoundError,
  ListingNotFoundError,
} from "@domain/errors/listing-error";

import { errorSchema, successSchema } from "../response.validator";
import {
  fuelTypeSchema,
  listingFields,
  listingResponseFields,
  statusSchema,
  transmissionSchema,
} from "./listing-fields.validator";

export const UpdateListingModel = new Elysia().model({
  "listing.update.params": t.Object({ id: t.String({ format: "uuid" }) }),
  "listing.update.body": t.Object(
    {
      category_id: t.Optional(listingFields.category_id),
      make: t.Optional(listingFields.make),
      model: t.Optional(listingFields.model),
      year: t.Optional(listingFields.year),
      price: t.Optional(listingFields.price),
      mileage: t.Optional(listingFields.mileage),
      condition: t.Optional(listingFields.condition),
      color: t.Optional(listingFields.color),
      location: t.Optional(listingFields.location),
      status: t.Optional(statusSchema),
      image_url: t.Optional(t.Nullable(t.String())),
      fuel_type: t.Optional(t.Nullable(fuelTypeSchema)),
      transmission: t.Optional(t.Nullable(transmissionSchema)),
      engine_cc: t.Optional(
        t.Nullable(t.Integer({ minimum: 0, maximum: 2147483647 })),
      ),
    },
    { additionalProperties: false, minProperties: 1 },
  ),
  "listing.updated": successSchema(
    t.Object({
      ...listingResponseFields,
      updated_at: t.String({ format: "date-time" }),
    }),
  ),
  "listing.not_found": errorSchema(new ListingNotFoundError()),
  "listing.update.category_not_found": errorSchema(
    new ListingCategoryNotFoundError(),
  ),
});

export const updateListingRouteDetail = {
  summary: "Update a Listing",
  description: "Updates the supplied fields of an existing vehicle listing.",
  tags: ["Listing"],
};
