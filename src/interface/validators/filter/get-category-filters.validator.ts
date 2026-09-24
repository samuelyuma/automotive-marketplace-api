import Elysia, { t } from "elysia";

import { CategoryNotFoundError } from "@domain/errors/category-error";

import {
  badRequestSchema,
  errorSchema,
  internalErrorSchema,
  successSchema,
} from "../response.validator";

const countSchema = t.Array(
  t.Object({
    value: t.String(),
    count: t.Integer({ minimum: 0 }),
  }),
);
const rangeSchema = t.Object({
  min: t.Nullable(t.Number()),
  max: t.Nullable(t.Number()),
});
const attributeBase = {
  id: t.String({ format: "uuid" }),
  key: t.String(),
  label: t.String(),
};

export const GetCategoryFiltersModel = new Elysia().model({
  "filter.category.params": t.Object({
    categoryId: t.String({ format: "uuid" }),
  }),
  "filter.category.query": t.Object({}, { additionalProperties: false }),
  "filter.category": successSchema(
    t.Object({
      category_id: t.String({ format: "uuid" }),
      condition: countSchema,
      fuel_type: countSchema,
      transmission: countSchema,
      price: rangeSchema,
      year: rangeSchema,
      mileage: rangeSchema,
      attributes: t.Array(
        t.Union([
          t.Object({
            ...attributeBase,
            type: t.Literal("ENUM"),
            options: t.Array(t.String()),
          }),
          t.Object({
            ...attributeBase,
            type: t.Literal("RANGE"),
            range: rangeSchema,
          }),
          t.Object({ ...attributeBase, type: t.Literal("BOOLEAN") }),
        ]),
      ),
    }),
  ),
  "filter.category.bad_request": badRequestSchema,
  "filter.category.not_found": errorSchema(new CategoryNotFoundError()),
  "filter.category.internal_error": internalErrorSchema,
});

export const getCategoryFiltersRouteDetail = {
  summary: "Get Category Filters",
  description:
    "Returns fixed filter counts and ranges from available listings in the category subtree, plus active attribute definitions from this category only. RANGE bounds are available for price, year, mileage, and engine_cc keys; other keys have null bounds.",
  tags: ["Filter"],
};
