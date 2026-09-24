import type {
  CategoryFilterRepository,
  CategoryFilterStats,
  FilterCount,
} from "@application/ports/category-filter-repository.port";
import type { CategoryRepository } from "@application/ports/category-repository.port";

import type { CategoryAttribute } from "@domain/entities/category";
import { CategoryNotFoundError } from "@domain/errors/category-error";

const conditionValues = ["NEW", "USED", "CERTIFIED"];
const fuelTypeValues = ["PETROL", "DIESEL", "HYBRID", "ELECTRIC"];
const transmissionValues = ["MANUAL", "AUTOMATIC"];

function includeUnused(values: string[], counts: FilterCount[]): FilterCount[] {
  const byValue = new Map(counts.map(({ value, count }) => [value, count]));
  return values.map((value) => ({ value, count: byValue.get(value) ?? 0 }));
}

function serializeAttribute(
  attribute: CategoryAttribute,
  stats: CategoryFilterStats,
) {
  const base = {
    id: attribute.id,
    key: attribute.key,
    label: attribute.label,
  };
  if (attribute.type === "ENUM")
    return { ...base, type: "ENUM" as const, options: attribute.options ?? [] };
  if (attribute.type === "RANGE") {
    const ranges: Record<string, CategoryFilterStats["price"]> = {
      price: stats.price,
      year: stats.year,
      mileage: stats.mileage,
      engine_cc: stats.engine_cc,
    };
    const range = ranges[attribute.key] ?? { min: null, max: null };
    return { ...base, type: "RANGE" as const, range };
  }
  return { ...base, type: "BOOLEAN" as const };
}

export class CategoryFilterService {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly filters: CategoryFilterRepository,
  ) {}

  async getForCategory(categoryId: string) {
    const detail = await this.categories.getWithChildren(categoryId);
    if (!detail) throw new CategoryNotFoundError();
    const stats = await this.filters.getForCategory(categoryId);
    return {
      category_id: categoryId,
      condition: includeUnused(conditionValues, stats.condition),
      fuel_type: includeUnused(fuelTypeValues, stats.fuel_type),
      transmission: includeUnused(transmissionValues, stats.transmission),
      price: stats.price,
      year: stats.year,
      mileage: stats.mileage,
      attributes: detail.category.attributes.map((attribute) =>
        serializeAttribute(attribute, stats),
      ),
    };
  }
}
