import Elysia, { t } from "elysia";

import type { CategoryAttribute } from "../../../domain/entities/category";
import { successSchema, withTimestamps } from "../response.validator";
import { attributeFields, categoryFields } from "./attribute.validator";

export type CategoryTreeResponseNode = {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
  attributes: Array<{
    id: string;
    category_id: string;
    key: string;
    label: string;
    type: CategoryAttribute["type"];
    options: string[] | null;
    created_at: string;
    updated_at: string;
  }>;
  children: CategoryTreeResponseNode[];
};

const categoryTreeNodeSchema = t.Unsafe<CategoryTreeResponseNode>(
  t.Recursive(
    (Self) =>
      t.Object({
        ...withTimestamps(categoryFields, "created_at", "updated_at"),
        attributes: t.Array(
          t.Object({
            ...withTimestamps(attributeFields, "created_at", "updated_at"),
          }),
        ),
        children: t.Array(Self),
      }),
    { $id: "CategoryTreeNode" },
  ),
);

export const ListCategoryModel = new Elysia().model({
  "category.tree": successSchema(t.Array(categoryTreeNodeSchema)),
});

export const listCategoryRouteDetail = {
  summary: "List Category Tree",
  description:
    "Returns all categories as a nested tree with active attributes.",
  tags: ["Category"],
};
