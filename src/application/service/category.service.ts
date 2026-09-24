import type { Category, NewCategory } from "@domain/entities/category";

import type { CategoryRepository } from "../ports/category-repository.port";

export class CategoryService {
  constructor(private readonly repository: CategoryRepository) {}

  async create(data: NewCategory): Promise<Category> {
    return this.repository.create(data);
  }
}
