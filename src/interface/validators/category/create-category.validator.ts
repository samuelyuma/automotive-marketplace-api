import Elysia, { t } from "elysia";

import {
  CategoryParentNotFoundError,
  CategorySlugConflictError,
} from "@domain/errors/category-error";

import {
  badRequestSchema,
  errorSchema,
  internalErrorSchema,
  successSchema,
} from "../response.validator";

export const CreateCategoryModel = new Elysia().model({
  "category.create.body": t.Object(
    {
      parent_id: t.Optional(t.Nullable(t.String({ format: "uuid" }))),
      name: t.String({ minLength: 1 }),
      slug: t.String({ minLength: 1 }),
    },
    { additionalProperties: false },
  ),
  "category.created": successSchema(
    t.Object({
      id: t.String({ format: "uuid" }),
      parent_id: t.Nullable(t.String({ format: "uuid" })),
      name: t.String(),
      slug: t.String(),
      created_at: t.String({ format: "date-time" }),
      updated_at: t.String({ format: "date-time" }),
    }),
  ),
  "category.bad_request": badRequestSchema,
  "category.slug_conflict": errorSchema(new CategorySlugConflictError()),
  "category.parent_not_found": errorSchema(new CategoryParentNotFoundError()),
  "category.internal_error": internalErrorSchema,
});

export const createCategoryRouteDetail = {
  summary: "Create a New Category",
  description: "Creates a root category or a child of an existing category.",
  tags: ["Category"],
};
