import Elysia, { t } from "elysia";

import {
  CategoryInvalidParentError,
  CategoryParentNotFoundError,
} from "../../../domain/errors/category-error";
import { errorSchema, successSchema } from "../response.validator";
import { databaseUuidSchema } from "../uuid.validator";
import {
  categoryAttributeInputSchema,
  updatedCategoryResponseSchema,
} from "./attribute.validator";
import { CategoryErrorsModel } from "./category-errors.validator";

export const UpdateCategoryModel = new Elysia().use(CategoryErrorsModel).model({
  "category.update.params": t.Object({ id: databaseUuidSchema }),
  "category.update.body": t.Object(
    {
      parent_id: t.Optional(t.Nullable(databaseUuidSchema)),
      name: t.Optional(t.String({ minLength: 1 })),
      slug: t.Optional(t.String({ minLength: 1 })),
      attributes: t.Optional(t.Array(categoryAttributeInputSchema)),
    },
    { additionalProperties: false, minProperties: 1 },
  ),
  "category.updated": successSchema(updatedCategoryResponseSchema),
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
