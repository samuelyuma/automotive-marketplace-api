import Elysia, { t } from "elysia";

import { successSchema } from "../response.validator";

export const DeleteListingModel = new Elysia().model({
  "listing.delete.params": t.Object({ id: t.String({ format: "uuid" }) }),
  "listing.deleted": successSchema(
    t.Object({
      id: t.String({ format: "uuid" }),
      status: t.Literal("REMOVED"),
      updated_at: t.String({ format: "date-time" }),
    }),
  ),
});

export const deleteListingRouteDetail = {
  summary: "Delete a Listing",
  description: "Marks an existing listing as removed.",
  tags: ["Listing"],
};
