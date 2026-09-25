import type {
  CategoryDetail,
  CategoryTreeNode,
  CategoryWithAttributes,
  NewCategory,
  UpdateCategory,
  UpdatedCategoryWithAttributes,
} from "../../domain/entities/category";
import {
  CategoryAttributeKeyConflictError,
  CategoryNotFoundError,
} from "../../domain/errors/category-error";
import { buildCategoryTree } from "../../domain/policies/category-tree";
import type { CategoryRepository } from "../ports/category-repository.port";

export class CategoryService {
  constructor(private readonly repository: CategoryRepository) {}

  async listTree(): Promise<CategoryTreeNode[]> {
    return buildCategoryTree(await this.repository.listHierarchy());
  }

  async getWithChildren(id: string): Promise<CategoryDetail> {
    const detail = await this.repository.getWithChildren(id);
    if (!detail) throw new CategoryNotFoundError();
    return detail;
  }

  async create(data: NewCategory): Promise<CategoryWithAttributes> {
    this.assertUniqueAttributeKeys(data.attributes);
    return this.repository.create(data);
  }

  async update(
    id: string,
    data: UpdateCategory,
  ): Promise<UpdatedCategoryWithAttributes> {
    this.assertUniqueAttributeKeys(data.attributes);
    const category = await this.repository.update(id, data);
    if (!category) throw new CategoryNotFoundError();
    return category;
  }

  private assertUniqueAttributeKeys(
    attributes?: NewCategory["attributes"],
  ): void {
    if (!attributes) return;
    const keys = attributes.map((attribute) => attribute.key);
    if (new Set(keys).size !== keys.length)
      throw new CategoryAttributeKeyConflictError();
  }
}
