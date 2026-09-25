import Elysia, { t } from "elysia";

import { successSchema, withTimestamps } from "../response.validator";
import { databaseUuidSchema } from "../uuid.validator";

export const DeleteListingModel = new Elysia().model({
  "listing.delete.params": t.Object({ id: databaseUuidSchema }),
  "listing.deleted": successSchema(
    t.Object(
      withTimestamps(
        {
          id: databaseUuidSchema,
          status: t.Literal("REMOVED"),
        },
        "updated_at",
      ),
    ),
  ),
});

export const deleteListingRouteDetail = {
  summary: "Delete a Listing",
  description: "Marks an existing listing as removed.",
  tags: ["Listing"],
};
