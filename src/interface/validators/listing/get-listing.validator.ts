import Elysia, { t } from "elysia";

import { ListingNotFoundError } from "../../../domain/errors/listing-error";
import {
  badRequestSchema,
  errorSchema,
  internalErrorSchema,
  successSchema,
} from "../response.validator";
import { listingResponseFields } from "./listing-fields.validator";

export const GetListingModel = new Elysia().model({
  "listing.detail.params": t.Object({ id: t.String({ format: "uuid" }) }),
  "listing.detail": successSchema(
    t.Object({
      ...listingResponseFields,
      created_at: t.String({ format: "date-time" }),
      updated_at: t.String({ format: "date-time" }),
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
