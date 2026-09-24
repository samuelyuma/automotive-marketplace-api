import type {
  Category,
  NewCategory,
  UpdateCategory,
} from "@domain/entities/category";

export interface CategoryRepository {
  create(data: NewCategory): Promise<Category>;
  update(id: string, data: UpdateCategory): Promise<Category | null>;
}
