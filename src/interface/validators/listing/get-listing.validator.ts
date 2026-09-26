import Elysia, { t } from "elysia";

import { ListingNotFoundError } from "../../../domain/errors/listing-error";
import {
  badRequestSchema,
  errorSchema,
  internalErrorSchema,
  successSchema,
  withTimestamps,
} from "../response.validator";
import { databaseUuidSchema } from "../uuid.validator";
import {
  listingAttributesSchema,
  listingResponseFields,
} from "./listing-fields.validator";

export const GetListingModel = new Elysia().model({
  "listing.detail.params": t.Object({ id: databaseUuidSchema }),
  "listing.detail": successSchema(
    t.Object({
      ...withTimestamps(listingResponseFields, "created_at", "updated_at"),
      attributes: listingAttributesSchema,
    }),
  ),
  "listing.detail.bad_request": badRequestSchema,
  "listing.detail.not_found": errorSchema(new ListingNotFoundError()),
  "listing.detail.internal_error": internalErrorSchema,
});

export const getListingRouteDetail = {
  summary: "Get a Listing",
  description: "Returns one listing unless it has been removed.",
  tags: ["Listing"],
};
