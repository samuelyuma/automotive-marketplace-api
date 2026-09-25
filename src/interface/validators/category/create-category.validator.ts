import Elysia, { t } from "elysia";

import {
  CategoryAttributeKeyConflictError,
  CategoryParentNotFoundError,
  CategorySlugConflictError,
} from "../../../domain/errors/category-error";
import {
  badRequestSchema,
  errorSchema,
  internalErrorSchema,
  successSchema,
} from "../response.validator";
import { databaseUuidSchema } from "../uuid.validator";
import {
  categoryAttributeInputSchema,
  createdCategoryResponseSchema,
} from "./attribute.validator";

export const CreateCategoryModel = new Elysia().model({
  "category.create.body": t.Object(
    {
      parent_id: t.Optional(t.Nullable(databaseUuidSchema)),
      name: t.String({ minLength: 1 }),
      slug: t.String({ minLength: 1 }),
      attributes: t.Optional(t.Array(categoryAttributeInputSchema)),
    },
    { additionalProperties: false },
  ),
  "category.created": successSchema(createdCategoryResponseSchema),
  "category.bad_request": badRequestSchema,
  "category.conflict": t.Union([
    errorSchema(new CategorySlugConflictError()),
    errorSchema(new CategoryAttributeKeyConflictError()),
  ]),
  "category.parent_not_found": errorSchema(new CategoryParentNotFoundError()),
  "category.internal_error": internalErrorSchema,
});

export const createCategoryRouteDetail = {
  summary: "Create a New Category",
  description: "Creates a root category or a child of an existing category.",
  tags: ["Category"],
};
