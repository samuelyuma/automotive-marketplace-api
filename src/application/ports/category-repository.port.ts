import type { Category, NewCategory } from "@domain/entities/category";

export interface CategoryRepository {
  create(data: NewCategory): Promise<Category>;
}
