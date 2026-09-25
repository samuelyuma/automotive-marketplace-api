import postgres from "postgres";

import type { CategoryRepository } from "../../application/ports/category-repository.port";
import { diffCategoryAttributes } from "../../application/utils/category-attribute-diff";
import type {
  Category,
  CategoryAttribute,
  CategoryDetail,
  CategoryWithAttributes,
  DeletedCategoryAttribute,
  NewCategory,
  UpdateCategory,
  UpdatedCategoryWithAttributes,
} from "../../domain/entities/category";
import {
  CategoryAttributeKeyConflictError,
  CategoryInvalidParentError,
  CategoryParentNotFoundError,
  CategorySlugConflictError,
} from "../../domain/errors/category-error";
import { sql } from "../../infrastructure/postgres/client";
import { timedQuery } from "../../infrastructure/postgres/timed-query";

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

type CategoryHierarchyRow = {
  id: string | null;
  parent_id: string | null;
  name: string | null;
  slug: string | null;
  created_at: Date | null;
  updated_at: Date | null;
  attribute_id: string | null;
  attribute_key: string | null;
  attribute_label: string | null;
  attribute_type: CategoryAttribute["type"] | null;
  attribute_options: string[] | null;
  attribute_created_at: Date | null;
  attribute_updated_at: Date | null;
  total_categories: string;
  reachable_categories: string;
};

type CategoryDetailRow = Category & {
  attribute_id: string | null;
  attribute_key: string | null;
  attribute_label: string | null;
  attribute_type: CategoryAttribute["type"] | null;
  attribute_options: string[] | null;
  attribute_created_at: Date | null;
  attribute_updated_at: Date | null;
};

export class PgCategoryRepository implements CategoryRepository {
  async getWithChildren(id: string): Promise<CategoryDetail | null> {
    return timedQuery("category.getWithChildren", "light", async () => {
      const rows = await sql<CategoryDetailRow[]>`
      SELECT category.id, category.parent_id, category.name, category.slug,
             category.created_at, category.updated_at,
             attribute.id AS attribute_id,
             attribute.key AS attribute_key,
             attribute.label AS attribute_label,
             attribute.type AS attribute_type,
             attribute.options AS attribute_options,
             attribute.created_at AS attribute_created_at,
             attribute.updated_at AS attribute_updated_at
      FROM categories category
      LEFT JOIN attribute_definitions attribute
        ON attribute.category_id = category.id AND attribute.deleted_at IS NULL
      WHERE category.id = ${id}
      ORDER BY attribute.key
    `;
      const first = rows[0];
      if (!first) return null;

      const attributes: CategoryAttribute[] = [];
      for (const row of rows) {
        if (row.attribute_id === null) continue;
        if (
          row.attribute_key === null ||
          row.attribute_label === null ||
          row.attribute_type === null ||
          row.attribute_created_at === null ||
          row.attribute_updated_at === null
        )
          throw new Error("Category attribute row is incomplete");
        attributes.push({
          id: row.attribute_id,
          category_id: id,
          key: row.attribute_key,
          label: row.attribute_label,
          type: row.attribute_type,
          options: row.attribute_options,
          created_at: row.attribute_created_at,
          updated_at: row.attribute_updated_at,
          deleted_at: null,
        });
      }

      const children = await sql<Category[]>`
      SELECT id, parent_id, name, slug, created_at, updated_at
      FROM categories
      WHERE parent_id = ${id}
      ORDER BY name, id
    `;

      return {
        category: {
          id: first.id,
          parent_id: first.parent_id,
          name: first.name,
          slug: first.slug,
          created_at: first.created_at,
          updated_at: first.updated_at,
          attributes,
        },
        children,
      };
    });
  }

  async listHierarchy(): Promise<CategoryWithAttributes[]> {
    return timedQuery("category.listHierarchy", "heavy", async () => {
      const rows = await sql<CategoryHierarchyRow[]>`
      WITH RECURSIVE category_tree AS (
        SELECT c.id, c.parent_id, c.name, c.slug, c.created_at, c.updated_at,
               ARRAY[c.id] AS path
        FROM categories c
        WHERE c.parent_id IS NULL

        UNION ALL

        SELECT c.id, c.parent_id, c.name, c.slug, c.created_at, c.updated_at,
               tree.path || c.id
        FROM categories c
        JOIN category_tree tree ON c.parent_id = tree.id
        WHERE NOT c.id = ANY(tree.path)
      ), counts AS (
        SELECT (SELECT count(*) FROM categories) AS total_categories,
               (SELECT count(*) FROM category_tree) AS reachable_categories
      )
      SELECT tree.id, tree.parent_id, tree.name, tree.slug,
             tree.created_at, tree.updated_at,
             attribute.id AS attribute_id,
             attribute.key AS attribute_key,
             attribute.label AS attribute_label,
             attribute.type AS attribute_type,
             attribute.options AS attribute_options,
             attribute.created_at AS attribute_created_at,
             attribute.updated_at AS attribute_updated_at,
             counts.total_categories, counts.reachable_categories
      FROM counts
      LEFT JOIN category_tree tree ON true
      LEFT JOIN attribute_definitions attribute
        ON attribute.category_id = tree.id AND attribute.deleted_at IS NULL
      ORDER BY tree.id, attribute.key
    `;

      const categories = new Map<string, CategoryWithAttributes>();
      for (const row of rows) {
        if (row.total_categories !== row.reachable_categories)
          throw new Error("Category hierarchy contains an unreachable cycle");
        if (row.id === null) continue;
        if (
          row.name === null ||
          row.slug === null ||
          row.created_at === null ||
          row.updated_at === null
        )
          throw new Error("Category hierarchy row is incomplete");

        let category = categories.get(row.id);
        if (!category) {
          category = {
            id: row.id,
            parent_id: row.parent_id,
            name: row.name,
            slug: row.slug,
            created_at: row.created_at,
            updated_at: row.updated_at,
            attributes: [],
          };
          categories.set(row.id, category);
        }
        if (row.attribute_id !== null) {
          if (
            row.attribute_key === null ||
            row.attribute_label === null ||
            row.attribute_type === null ||
            row.attribute_created_at === null ||
            row.attribute_updated_at === null
          )
            throw new Error("Category attribute row is incomplete");
          category.attributes.push({
            id: row.attribute_id,
            category_id: row.id,
            key: row.attribute_key,
            label: row.attribute_label,
            type: row.attribute_type,
            options: row.attribute_options,
            created_at: row.attribute_created_at,
            updated_at: row.attribute_updated_at,
            deleted_at: null,
          });
        }
      }
      return [...categories.values()];
    });
  }

  async create(data: NewCategory): Promise<CategoryWithAttributes> {
    return timedQuery("category.create", "light", async () => {
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
    });
  }

  async update(
    id: string,
    data: UpdateCategory,
  ): Promise<UpdatedCategoryWithAttributes | null> {
    return timedQuery("category.update", "light", async () => {
      try {
        return await sql.begin(async (tx) => {
          if (typeof data.parent_id === "string") {
            // Serialize parent moves so two concurrent updates cannot create a cycle.
            await tx`SELECT pg_advisory_xact_lock(724331, 1)`;
            const [cycle] = await tx`
            WITH RECURSIVE descendants AS (
              SELECT id FROM categories WHERE id = ${id}
              UNION
              SELECT c.id FROM categories c
              JOIN descendants d ON c.parent_id = d.id
            )
            SELECT 1 FROM descendants WHERE id = ${data.parent_id}::uuid
          `;
            if (cycle) throw new CategoryInvalidParentError();
          }
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
    });
  }
}
