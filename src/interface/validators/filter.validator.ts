import Elysia, { t } from "elysia";

import { CategoryNotFoundError } from "../../domain/errors/category-error";
import {
  badRequestSchema,
  errorSchema,
  internalErrorSchema,
  successSchema,
} from "./response.validator";
import { databaseUuidSchema } from "./uuid.validator";

const filterCountSchema = t.Array(
  t.Object({
    value: t.String(),
    count: t.Integer({ minimum: 0 }),
  }),
);
const filterRangeSchema = t.Object({
  min: t.Nullable(t.Number()),
  max: t.Nullable(t.Number()),
});
const attributeBase = {
  id: databaseUuidSchema,
  key: t.String(),
  label: t.String(),
};

export const FilterModel = new Elysia().model({
  "filter.list.query": t.Object({}, { additionalProperties: false }),
  "filter.list": successSchema(
    t.Object({
      condition: filterCountSchema,
      fuel_type: filterCountSchema,
      transmission: filterCountSchema,
      price: filterRangeSchema,
      year: filterRangeSchema,
      mileage: filterRangeSchema,
    }),
  ),
  "filter.list.bad_request": badRequestSchema,
  "filter.list.internal_error": internalErrorSchema,
  "filter.category.params": t.Object({
    categoryId: databaseUuidSchema,
  }),
  "filter.category.query": t.Object({}, { additionalProperties: false }),
  "filter.category": successSchema(
    t.Object({
      category_id: databaseUuidSchema,
      condition: filterCountSchema,
      fuel_type: filterCountSchema,
      transmission: filterCountSchema,
      price: filterRangeSchema,
      year: filterRangeSchema,
      mileage: filterRangeSchema,
      attributes: t.Array(
        t.Union([
          t.Object({
            ...attributeBase,
            type: t.Literal("ENUM"),
            options: t.Array(t.String()),
            counts: filterCountSchema,
          }),
          t.Object({
            ...attributeBase,
            type: t.Literal("RANGE"),
            range: filterRangeSchema,
          }),
          t.Object({
            ...attributeBase,
            type: t.Literal("BOOLEAN"),
            counts: t.Object({
              true: t.Integer({ minimum: 0 }),
              false: t.Integer({ minimum: 0 }),
            }),
          }),
        ]),
      ),
    }),
  ),
  "filter.category.bad_request": badRequestSchema,
  "filter.category.not_found": errorSchema(new CategoryNotFoundError()),
  "filter.category.internal_error": internalErrorSchema,
});

export const getFiltersRouteDetail = {
  summary: "Get Filters",
  description:
    "Returns catalog-wide condition, fuel type, and transmission counts and price, year, and mileage bounds from available listings. Unused enum values have zero counts.",
  tags: ["Search & Filters"],
};

export const getCategoryFiltersRouteDetail = {
  summary: "Get Category Filters",
  description:
    "Returns fixed filter counts and ranges from available listings in the category subtree, plus counts and ranges for active attribute definitions from listings in this category.",
  tags: ["Search & Filters"],
};
