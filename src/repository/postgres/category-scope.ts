import { sql } from "../../infrastructure/postgres/client";

// Include the category and its descendants; the path stops recursive cycles.
export function categoryScopeIds(categoryId: string) {
  return sql`
    WITH RECURSIVE category_scope AS (
      -- Start with the requested category.
      SELECT id, ARRAY[id] AS path
      FROM categories
      WHERE id = ${categoryId}::uuid
      UNION ALL
      -- Add descendants, but do not revisit a category already in this path.
      SELECT child.id, category_scope.path || child.id
      FROM categories child
      JOIN category_scope ON child.parent_id = category_scope.id
      WHERE NOT child.id = ANY(category_scope.path)
    )
    SELECT id FROM category_scope
  `;
}
