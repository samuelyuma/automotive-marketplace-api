import type {
  CategoryAttribute,
  CategoryDetail,
  CategoryWithAttributes,
  NewCategory,
  UpdateCategory,
  UpdatedCategoryWithAttributes,
} from "../../domain/entities/category";

export interface CategoryRepository {
  getAttributeById(id: string): Promise<CategoryAttribute | null>;
  listHierarchy(): Promise<CategoryWithAttributes[]>;
  getWithChildren(id: string): Promise<CategoryDetail | null>;
  create(data: NewCategory): Promise<CategoryWithAttributes>;
  update(
    id: string,
    data: UpdateCategory,
  ): Promise<UpdatedCategoryWithAttributes | null>;
}
