import Elysia, { t } from "elysia";

import {
  ListingAttributeCategoryMismatchError,
  ListingAttributeNotFoundError,
  ListingCategoryNotFoundError,
} from "../../../domain/errors/listing-error";
import { PG_INT32_MAX } from "../../../domain/postgres";
import {
  badRequestSchema,
  errorSchema,
  internalErrorSchema,
  successSchema,
  withTimestamps,
} from "../response.validator";
import {
  fuelTypeSchema,
  listingFields,
  listingResponseFields,
  submittedAttributesSchema,
  transmissionSchema,
} from "./listing-fields.validator";

export const CreateListingModel = new Elysia().model({
  "listing.create.body": t.Object(
    {
      ...listingFields,
      image_url: t.Optional(t.Nullable(t.String())),
      fuel_type: t.Optional(t.Nullable(fuelTypeSchema)),
      transmission: t.Optional(t.Nullable(transmissionSchema)),
      engine_cc: t.Optional(
        t.Nullable(t.Integer({ minimum: 0, maximum: PG_INT32_MAX })),
      ),
      attributes: t.Optional(submittedAttributesSchema),
    },
    { additionalProperties: false },
  ),
  "listing.created": successSchema(
    t.Object(withTimestamps(listingResponseFields, "created_at")),
  ),
  "listing.bad_request": t.Union([
    badRequestSchema,
    errorSchema(new ListingAttributeNotFoundError()),
    errorSchema(new ListingAttributeCategoryMismatchError()),
  ]),
  "listing.category_not_found": errorSchema(new ListingCategoryNotFoundError()),
  "listing.internal_error": internalErrorSchema,
});

export const createListingRouteDetail = {
  summary: "Create a New Listing",
  description: "Creates a vehicle listing in an existing category.",
  tags: ["Listing"],
};
