import type {
  Category,
  NewCategory,
  UpdateCategory,
} from "@domain/entities/category";
import { CategoryNotFoundError } from "@domain/errors/category-error";

import type { CategoryRepository } from "../ports/category-repository.port";

export class CategoryService {
  constructor(private readonly repository: CategoryRepository) {}

  async create(data: NewCategory): Promise<Category> {
    return this.repository.create(data);
  }

  async update(id: string, data: UpdateCategory): Promise<Category> {
    const category = await this.repository.update(id, data);
    if (!category) throw new CategoryNotFoundError();
    return category;
  }
}
