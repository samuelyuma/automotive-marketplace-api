import Elysia, { t } from "elysia";

import { successSchema } from "../response.validator";
import { attributeFields, categoryFields } from "./attribute.validator";

const categorySummarySchema = t.Object({
  ...categoryFields,
  created_at: t.String({ format: "date-time" }),
  updated_at: t.String({ format: "date-time" }),
});

export const GetCategoryModel = new Elysia().model({
  "category.detail.params": t.Object({ id: t.String({ format: "uuid" }) }),
  "category.detail": successSchema(
    t.Object({
      ...categoryFields,
      created_at: t.String({ format: "date-time" }),
      updated_at: t.String({ format: "date-time" }),
      attributes: t.Array(
        t.Object({
          ...attributeFields,
          created_at: t.String({ format: "date-time" }),
          updated_at: t.String({ format: "date-time" }),
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
