import type {
  CategoryWithAttributes,
  NewCategory,
  UpdateCategory,
  UpdatedCategoryWithAttributes,
} from "@domain/entities/category";

export interface CategoryRepository {
  create(data: NewCategory): Promise<CategoryWithAttributes>;
  update(
    id: string,
    data: UpdateCategory,
  ): Promise<UpdatedCategoryWithAttributes | null>;
}
