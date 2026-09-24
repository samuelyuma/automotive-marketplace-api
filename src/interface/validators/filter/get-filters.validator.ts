import Elysia, { t } from "elysia";

import {
  badRequestSchema,
  internalErrorSchema,
  successSchema,
} from "../response.validator";
import {
  filterCountSchema,
  filterRangeSchema,
} from "./get-category-filters.validator";

export const GetFiltersModel = new Elysia().model({
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
});

export const getFiltersRouteDetail = {
  summary: "Get Filters",
  description:
    "Returns catalog-wide condition, fuel type, and transmission counts and price, year, and mileage bounds from available listings. Unused enum values have zero counts.",
  tags: ["Filter"],
};
