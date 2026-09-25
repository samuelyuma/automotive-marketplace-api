import Elysia, { t } from "elysia";

import { successSchema, withTimestamps } from "../response.validator";
import { databaseUuidSchema } from "../uuid.validator";
import { attributeFields, categoryFields } from "./attribute.validator";

const categorySummarySchema = t.Object({
  ...withTimestamps(categoryFields, "created_at", "updated_at"),
});

export const GetCategoryModel = new Elysia().model({
  "category.detail.params": t.Object({ id: databaseUuidSchema }),
  "category.detail": successSchema(
    t.Object({
      ...withTimestamps(categoryFields, "created_at", "updated_at"),
      attributes: t.Array(
        t.Object({
          ...withTimestamps(attributeFields, "created_at", "updated_at"),
        }),
      ),
      children: t.Array(categorySummarySchema),
    }),
  ),
});

export const getCategoryRouteDetail = {
  summary: "Get Category",
  description:
    "Returns one category with its active attributes and direct children.",
  tags: ["Category"],
};
