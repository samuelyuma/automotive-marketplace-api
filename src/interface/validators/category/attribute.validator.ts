import { t } from "elysia";

import { withTimestamps } from "../response.validator";
import { databaseUuidSchema } from "../uuid.validator";

export const categoryAttributeInputSchema = t.Object(
  {
    key: t.String({ minLength: 1 }),
    label: t.String({ minLength: 1 }),
    type: t.Union([
      t.Literal("ENUM"),
      t.Literal("RANGE"),
      t.Literal("BOOLEAN"),
    ]),
    options: t.Optional(t.Nullable(t.Array(t.String(), { maxItems: 25 }))),
  },
  { additionalProperties: false },
);

export const categoryFields = {
  id: databaseUuidSchema,
  parent_id: t.Nullable(databaseUuidSchema),
  name: t.String(),
  slug: t.String(),
};

export const attributeFields = {
  id: databaseUuidSchema,
  category_id: databaseUuidSchema,
  key: t.String(),
  label: t.String(),
  type: t.Union([t.Literal("ENUM"), t.Literal("RANGE"), t.Literal("BOOLEAN")]),
  options: t.Nullable(t.Array(t.String())),
};

export const createdCategoryResponseSchema = t.Object({
  ...withTimestamps(categoryFields, "created_at"),
  attributes: t.Array(
    t.Object({
      ...withTimestamps(attributeFields, "created_at"),
    }),
  ),
});

export const updatedCategoryResponseSchema = t.Object({
  ...withTimestamps(categoryFields, "updated_at"),
  attributes: t.Array(
    t.Union([
      t.Object({
        ...withTimestamps(attributeFields, "updated_at"),
      }),
      t.Object({
        id: databaseUuidSchema,
        deleted_at: t.String({ format: "date-time" }),
      }),
    ]),
  ),
});
