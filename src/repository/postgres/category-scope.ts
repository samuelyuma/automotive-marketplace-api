import { sql } from "../../infrastructure/postgres/client";

export function categoryScopeIds(categoryId: string) {
  return sql`
    WITH RECURSIVE category_scope AS (
      SELECT id, ARRAY[id] AS path
      FROM categories
      WHERE id = ${categoryId}::uuid
      UNION ALL
      SELECT child.id, category_scope.path || child.id
      FROM categories child
      JOIN category_scope ON child.parent_id = category_scope.id
      WHERE NOT child.id = ANY(category_scope.path)
    )
    SELECT id FROM category_scope
  `;
}
