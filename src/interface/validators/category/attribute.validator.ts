import { t } from "elysia";

export const categoryAttributeInputSchema = t.Object(
  {
    key: t.String({ minLength: 1 }),
    label: t.String({ minLength: 1 }),
    type: t.Union([
      t.Literal("ENUM"),
      t.Literal("RANGE"),
      t.Literal("BOOLEAN"),
    ]),
    options: t.Optional(t.Nullable(t.Array(t.String()))),
  },
  { additionalProperties: false },
);

const categoryFields = {
  id: t.String({ format: "uuid" }),
  parent_id: t.Nullable(t.String({ format: "uuid" })),
  name: t.String(),
  slug: t.String(),
};

const attributeFields = {
  id: t.String({ format: "uuid" }),
  category_id: t.String({ format: "uuid" }),
  key: t.String(),
  label: t.String(),
  type: t.Union([t.Literal("ENUM"), t.Literal("RANGE"), t.Literal("BOOLEAN")]),
  options: t.Nullable(t.Array(t.String())),
};

export const createdCategoryResponseSchema = t.Object({
  ...categoryFields,
  created_at: t.String({ format: "date-time" }),
  attributes: t.Array(
    t.Object({
      ...attributeFields,
      created_at: t.String({ format: "date-time" }),
    }),
  ),
});

export const updatedCategoryResponseSchema = t.Object({
  ...categoryFields,
  updated_at: t.String({ format: "date-time" }),
  attributes: t.Array(
    t.Union([
      t.Object({
        ...attributeFields,
        updated_at: t.String({ format: "date-time" }),
      }),
      t.Object({
        id: t.String({ format: "uuid" }),
        deleted_at: t.String({ format: "date-time" }),
      }),
    ]),
  ),
});
