import Elysia, { t } from "elysia";

import { UPDATABLE_LISTING_STATUSES } from "../../../domain/entities/listing";
import {
  ListingCategoryNotFoundError,
  ListingNotFoundError,
} from "../../../domain/errors/listing-error";
import {
  errorSchema,
  successSchema,
  withTimestamps,
} from "../response.validator";
import { databaseUuidSchema } from "../uuid.validator";
import {
  fuelTypeSchema,
  listingFields,
  listingResponseFields,
  transmissionSchema,
} from "./listing-fields.validator";

type UpdatableStatus = NonNullable<(typeof UPDATABLE_LISTING_STATUSES)[number]>;

export const UpdateListingModel = new Elysia().model({
  "listing.update.params": t.Object({ id: databaseUuidSchema }),
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
      status: t.Optional(
        t.Union([
          t.Literal(UPDATABLE_LISTING_STATUSES[0] as UpdatableStatus),
          t.Literal(UPDATABLE_LISTING_STATUSES[1] as UpdatableStatus),
          t.Literal(UPDATABLE_LISTING_STATUSES[2] as UpdatableStatus),
        ]),
      ),
      image_url: t.Optional(t.Nullable(t.String())),
      fuel_type: t.Optional(t.Nullable(fuelTypeSchema)),
      transmission: t.Optional(t.Nullable(transmissionSchema)),
    },
    { additionalProperties: false, minProperties: 1 },
  ),
  "listing.updated": successSchema(
    t.Object(withTimestamps(listingResponseFields, "updated_at")),
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
