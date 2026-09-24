import postgres from "postgres";

import type { CategoryRepository } from "@application/ports/category-repository.port";

import type { Category, NewCategory } from "@domain/entities/category";
import {
  CategoryParentNotFoundError,
  CategorySlugConflictError,
} from "@domain/errors/category-error";

import { sql } from "@infrastructure/postgres/client";

export class PgCategoryRepository implements CategoryRepository {
  async create(data: NewCategory): Promise<Category> {
    try {
      const [category] = await sql<Category[]>`
        INSERT INTO categories (parent_id, name, slug)
        VALUES (${data.parent_id ?? null}, ${data.name}, ${data.slug})
        RETURNING id, parent_id, name, slug, created_at, updated_at
      `;

      if (!category) throw new Error("Category insert returned no row");
      return category;
    } catch (error) {
      if (error instanceof postgres.PostgresError) {
        if (
          error.code === "23505" &&
          error.constraint_name === "categories_slug_key"
        )
          throw new CategorySlugConflictError();
        if (
          error.code === "23503" &&
          error.constraint_name === "categories_parent_id_fkey"
        )
          throw new CategoryParentNotFoundError();
      }
      throw error;
    }
  }
}
