import Elysia, { t } from "elysia";

import {
  CategoryInvalidParentError,
  CategoryNotFoundError,
  CategoryParentNotFoundError,
} from "@domain/errors/category-error";

import { errorSchema, successSchema } from "../response.validator";

export const UpdateCategoryModel = new Elysia().model({
  "category.update.params": t.Object({ id: t.String({ format: "uuid" }) }),
  "category.update.body": t.Object(
    {
      parent_id: t.Optional(t.Nullable(t.String({ format: "uuid" }))),
      name: t.Optional(t.String({ minLength: 1 })),
      slug: t.Optional(t.String({ minLength: 1 })),
    },
    { additionalProperties: false, minProperties: 1 },
  ),
  "category.updated": successSchema(
    t.Object({
      id: t.String({ format: "uuid" }),
      parent_id: t.Nullable(t.String({ format: "uuid" })),
      name: t.String(),
      slug: t.String(),
      created_at: t.String({ format: "date-time" }),
      updated_at: t.String({ format: "date-time" }),
    }),
  ),
  "category.not_found": errorSchema(new CategoryNotFoundError()),
  "category.update.invalid_parent": t.Union([
    errorSchema(new CategoryParentNotFoundError()),
    errorSchema(new CategoryInvalidParentError()),
  ]),
});

export const updateCategoryRouteDetail = {
  summary: "Update a Category",
  description: "Updates the supplied fields of an existing category.",
  tags: ["Category"],
};
