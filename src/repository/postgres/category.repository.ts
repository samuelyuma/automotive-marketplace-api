import postgres from "postgres";

import type { CategoryRepository } from "../../application/ports/category-repository.port";
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
import { diffCategoryAttributes } from "../../domain/policies/category-attribute-diff";
import { PG_TEXT_TYPE_OID } from "../../domain/postgres";
import { sql } from "../../infrastructure/postgres/client";
import { timedQuery } from "../../infrastructure/postgres/timed-query";
import { CONSTRAINTS } from "./constraint-names";

// Turn known database constraints into the API's category errors.
function throwCategoryError(error: unknown): never {
  if (error instanceof postgres.PostgresError) {
    if (
      error.code === "23505" &&
      error.constraint_name === CONSTRAINTS.categorySlugUnique
    )
      throw new CategorySlugConflictError();
    if (
      error.code === "23505" &&
      (error.constraint_name === CONSTRAINTS.categoryAttributeKeyUnique ||
        error.constraint_name === CONSTRAINTS.categoryAttributeActiveKeyUnique)
    )
      throw new CategoryAttributeKeyConflictError();
    if (
      error.code === "23503" &&
      error.constraint_name === CONSTRAINTS.categoryParentFk
    )
      throw new CategoryParentNotFoundError();
    if (
      error.code === "23514" &&
      error.constraint_name === CONSTRAINTS.categoryNotSelfParent
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

type AttributeJoinColumns = {
  attribute_id: string | null;
  attribute_key: string | null;
  attribute_label: string | null;
  attribute_type: CategoryAttribute["type"] | null;
  attribute_options: string[] | null;
  attribute_created_at: Date | null;
  attribute_updated_at: Date | null;
};

// A left join has no attribute ID when the category has no definitions.
function toCategoryAttribute(
  row: AttributeJoinColumns,
  categoryId: string,
): CategoryAttribute | null {
  if (row.attribute_id === null) return null;
  if (
    row.attribute_key === null ||
    row.attribute_label === null ||
    row.attribute_type === null ||
    row.attribute_created_at === null ||
    row.attribute_updated_at === null
  )
    throw new Error("Category attribute row is incomplete");

  return {
    id: row.attribute_id,
    category_id: categoryId,
    key: row.attribute_key,
    label: row.attribute_label,
    type: row.attribute_type,
    options: row.attribute_options,
    created_at: row.attribute_created_at,
    updated_at: row.attribute_updated_at,
    deleted_at: null,
  };
}

export class PgCategoryRepository implements CategoryRepository {
  // Lets listing validation distinguish an unknown definition from a foreign one.
  async getAttributeById(id: string): Promise<CategoryAttribute | null> {
    const [attribute] = await sql<CategoryAttribute[]>`
      SELECT id, category_id, key, label, type, options, created_at, updated_at, deleted_at
      FROM attribute_definitions WHERE id = ${id} AND deleted_at IS NULL
    `;
    return attribute ?? null;
  }
  // The left join keeps categories with no definitions in the result.
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
      -- A left join still returns a category with no active definitions.
      LEFT JOIN attribute_definitions attribute
        ON attribute.category_id = category.id AND attribute.deleted_at IS NULL
      WHERE category.id = ${id}
      ORDER BY attribute.key
    `;
      const first = rows[0];
      if (!first) return null;

      const attributes: CategoryAttribute[] = [];
      for (const row of rows) {
        const attribute = toCategoryAttribute(row, id);
        if (attribute) attributes.push(attribute);
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

  // The recursive query also checks that every category is reachable from a root.
  async listHierarchy(): Promise<CategoryWithAttributes[]> {
    return timedQuery("category.listHierarchy", "heavy", async () => {
      const rows = await sql<CategoryHierarchyRow[]>`
      WITH RECURSIVE category_tree AS (
        -- Seed the tree with root categories.
        SELECT c.id, c.parent_id, c.name, c.slug, c.created_at, c.updated_at,
               ARRAY[c.id] AS path
        FROM categories c
        WHERE c.parent_id IS NULL

        UNION ALL

        -- Track each path so a cycle cannot repeat a category.
        SELECT c.id, c.parent_id, c.name, c.slug, c.created_at, c.updated_at,
               tree.path || c.id
        FROM categories c
        JOIN category_tree tree ON c.parent_id = tree.id
        WHERE NOT c.id = ANY(tree.path)
      ), counts AS (
        -- Compare all rows with reachable rows to catch disconnected cycles.
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

      // Fold the joined definition rows back into one object per category.
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
        const attribute = toCategoryAttribute(row, row.id);
        if (attribute) category.attributes.push(attribute);
      }
      return [...categories.values()];
    });
  }

  // Save the category and its definitions in one transaction.
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
            // Supply the text array type even when the options list is empty.
            await tx`
            INSERT INTO attribute_definitions (category_id, key, label, type, options)
            VALUES (${category.id}, ${attribute.key}, ${attribute.label}, ${attribute.type}, ${attribute.options == null ? null : tx.array(attribute.options, PG_TEXT_TYPE_OID)})
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

  // Apply definition inserts, edits, and soft deletes alongside the category edit.
  async update(
    id: string,
    data: UpdateCategory,
  ): Promise<UpdatedCategoryWithAttributes | null> {
    return timedQuery("category.update", "light", async () => {
      try {
        return await sql.begin(async (tx) => {
          if (typeof data.parent_id === "string") {
            // Serialize parent moves before checking for a category cycle.
            const CATEGORY_PARENT_MOVE_LOCK_KEY = 724331;
            await tx`SELECT pg_advisory_xact_lock(${CATEGORY_PARENT_MOVE_LOCK_KEY}, 1)`;
            const [cycle] = await tx`
            WITH RECURSIVE descendants AS (
              SELECT id FROM categories WHERE id = ${id}
              UNION
              SELECT c.id FROM categories c
              JOIN descendants d ON c.parent_id = d.id
            )
            -- A category cannot move beneath one of its descendants.
            SELECT 1 FROM descendants WHERE id = ${data.parent_id}::uuid
          `;
            if (cycle) throw new CategoryInvalidParentError();
          }
          const [category] = await tx<Category[]>`
          UPDATE categories
          -- Undefined leaves the parent unchanged; null moves to the root.
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
            // A supplied array replaces the active definition set by key.
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
              // Keep options typed as text[] for empty lists too.
              await tx`
              UPDATE attribute_definitions
              SET label = ${attribute.label},
                  type = ${attribute.type},
                  options = ${attribute.options == null ? null : tx.array(attribute.options, PG_TEXT_TYPE_OID)},
                  updated_at = now()
              WHERE category_id = ${id} AND key = ${attribute.key} AND deleted_at IS NULL
            `;
            }
            for (const attribute of diff.insert) {
              await tx`
              INSERT INTO attribute_definitions (category_id, key, label, type, options)
              VALUES (${id}, ${attribute.key}, ${attribute.label}, ${attribute.type}, ${attribute.options == null ? null : tx.array(attribute.options, PG_TEXT_TYPE_OID)})
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
