import postgres from "postgres";

import type { CategoryRepository } from "@application/ports/category-repository.port";
import { diffCategoryAttributes } from "@application/utils/category-attribute-diff";

import type {
  Category,
  CategoryAttribute,
  CategoryWithAttributes,
  DeletedCategoryAttribute,
  NewCategory,
  UpdateCategory,
  UpdatedCategoryWithAttributes,
} from "@domain/entities/category";
import {
  CategoryAttributeKeyConflictError,
  CategoryInvalidParentError,
  CategoryParentNotFoundError,
  CategorySlugConflictError,
} from "@domain/errors/category-error";

import { sql } from "@infrastructure/postgres/client";

function throwCategoryError(error: unknown): never {
  if (error instanceof postgres.PostgresError) {
    if (
      error.code === "23505" &&
      error.constraint_name === "categories_slug_key"
    )
      throw new CategorySlugConflictError();
    if (
      error.code === "23505" &&
      (error.constraint_name === "attribute_definitions_category_key" ||
        error.constraint_name === "attribute_definitions_active_category_key")
    )
      throw new CategoryAttributeKeyConflictError();
    if (
      error.code === "23503" &&
      error.constraint_name === "categories_parent_id_fkey"
    )
      throw new CategoryParentNotFoundError();
    if (
      error.code === "23514" &&
      error.constraint_name === "categories_not_self_parent"
    )
      throw new CategoryInvalidParentError();
  }
  throw error;
}

export class PgCategoryRepository implements CategoryRepository {
  async create(data: NewCategory): Promise<CategoryWithAttributes> {
    try {
      return await sql.begin(async (tx) => {
        const [category] = await tx<Category[]>`
          INSERT INTO categories (parent_id, name, slug)
          VALUES (${data.parent_id ?? null}, ${data.name}, ${data.slug})
          RETURNING id, parent_id, name, slug, created_at, updated_at
        `;

        if (!category) throw new Error("Category insert returned no row");
        for (const attribute of data.attributes ?? []) {
          await tx`
            INSERT INTO attribute_definitions (category_id, key, label, type, options)
            VALUES (${category.id}, ${attribute.key}, ${attribute.label}, ${attribute.type}, ${attribute.options == null ? null : tx.array(attribute.options, 25)})
          `;
        }

        const attributes = await tx<CategoryAttribute[]>`
          SELECT id, category_id, key, label, type, options, created_at, updated_at, deleted_at
          FROM attribute_definitions WHERE category_id = ${category.id} AND deleted_at IS NULL
          ORDER BY key
        `;
        return { ...category, attributes };
      });
    } catch (error) {
      throwCategoryError(error);
    }
  }

  async update(
    id: string,
    data: UpdateCategory,
  ): Promise<UpdatedCategoryWithAttributes | null> {
    try {
      return await sql.begin(async (tx) => {
        const [category] = await tx<Category[]>`
          UPDATE categories
          SET parent_id = CASE WHEN ${data.parent_id !== undefined} THEN ${data.parent_id ?? null}::uuid ELSE parent_id END,
              name = COALESCE(${data.name ?? null}, name),
              slug = COALESCE(${data.slug ?? null}, slug),
              updated_at = now()
          WHERE id = ${id}
          RETURNING id, parent_id, name, slug, created_at, updated_at
        `;
        if (!category) return null;

        const deletedAttributes: DeletedCategoryAttribute[] = [];
        if (data.attributes !== undefined) {
          const existing = await tx<CategoryAttribute[]>`
            SELECT id, category_id, key, label, type, options, created_at, updated_at, deleted_at
            FROM attribute_definitions WHERE category_id = ${id} AND deleted_at IS NULL
          `;
          const diff = diffCategoryAttributes(existing, data.attributes);

          for (const key of diff.remove) {
            const [deleted] = await tx<DeletedCategoryAttribute[]>`
              UPDATE attribute_definitions
              SET deleted_at = now(), updated_at = now()
              WHERE category_id = ${id} AND key = ${key} AND deleted_at IS NULL
              RETURNING id, deleted_at
            `;
            if (deleted) deletedAttributes.push(deleted);
          }
          for (const attribute of diff.update) {
            await tx`
              UPDATE attribute_definitions
              SET label = ${attribute.label},
                  type = ${attribute.type},
                  options = ${attribute.options == null ? null : tx.array(attribute.options, 25)},
                  updated_at = now()
              WHERE category_id = ${id} AND key = ${attribute.key} AND deleted_at IS NULL
            `;
          }
          for (const attribute of diff.insert) {
            await tx`
              INSERT INTO attribute_definitions (category_id, key, label, type, options)
              VALUES (${id}, ${attribute.key}, ${attribute.label}, ${attribute.type}, ${attribute.options == null ? null : tx.array(attribute.options, 25)})
            `;
          }
        }

        const attributes = await tx<CategoryAttribute[]>`
          SELECT id, category_id, key, label, type, options, created_at, updated_at, deleted_at
          FROM attribute_definitions WHERE category_id = ${id} AND deleted_at IS NULL
          ORDER BY key
        `;
        return {
          ...category,
          attributes,
          deleted_attributes: deletedAttributes,
        };
      });
    } catch (error) {
      throwCategoryError(error);
    }
  }
}
