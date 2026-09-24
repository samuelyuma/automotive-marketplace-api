import type {
  CategoryWithAttributes,
  NewCategory,
  UpdateCategory,
  UpdatedCategoryWithAttributes,
} from "@domain/entities/category";

export interface CategoryRepository {
  listHierarchy(): Promise<CategoryWithAttributes[]>;
  create(data: NewCategory): Promise<CategoryWithAttributes>;
  update(
    id: string,
    data: UpdateCategory,
  ): Promise<UpdatedCategoryWithAttributes | null>;
}
