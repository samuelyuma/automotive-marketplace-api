import type { CategoryAttribute } from "../../domain/entities/category";
import {
  FUEL_TYPES,
  LISTING_CONDITIONS,
  TRANSMISSIONS,
} from "../../domain/entities/listing";
import { CategoryNotFoundError } from "../../domain/errors/category-error";
import type { CategoryRepository } from "../ports/category-repository.port";
import type {
  FilterCount,
  FilterRepository,
  FilterStats,
} from "../ports/filter-repository.port";

// Show zero counts for options that have no available listings.
function includeUnused(
  values: readonly string[],
  counts: FilterCount[],
): FilterCount[] {
  const byValue = new Map(counts.map(({ value, count }) => [value, count]));
  return values.map((value) => ({ value, count: byValue.get(value) ?? 0 }));
}

function fixedFilters(stats: FilterStats) {
  return {
    condition: includeUnused(LISTING_CONDITIONS, stats.condition),
    fuel_type: includeUnused(FUEL_TYPES, stats.fuel_type),
    transmission: includeUnused(TRANSMISSIONS, stats.transmission),
    price: stats.price,
    year: stats.year,
    mileage: stats.mileage,
  };
}

// Keep ENUM options in their existing shape and attach the saved-value stats.
function serializeAttribute(attribute: CategoryAttribute, stats: FilterStats) {
  const base = {
    id: attribute.id,
    key: attribute.key,
    label: attribute.label,
  };
  const attributeStats = stats.attributes[attribute.id];
  if (attribute.type === "ENUM")
    return {
      ...base,
      type: "ENUM" as const,
      options: attribute.options ?? [],
      counts: includeUnused(
        attribute.options ?? [],
        attributeStats?.counts ?? [],
      ),
    };
  if (attribute.type === "RANGE") {
    return {
      ...base,
      type: "RANGE" as const,
      range: attributeStats?.range ?? { min: null, max: null },
    };
  }
  return {
    ...base,
    type: "BOOLEAN" as const,
    counts: {
      true: attributeStats?.true_count ?? 0,
      false: attributeStats?.false_count ?? 0,
    },
  };
}

export class FilterService {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly filters: FilterRepository,
  ) {}

  async getGlobal() {
    return fixedFilters(await this.filters.getGlobal());
  }

  async getForCategory(categoryId: string) {
    const detail = await this.categories.getWithChildren(categoryId);
    if (!detail) throw new CategoryNotFoundError();
    const stats = await this.filters.getForCategory(categoryId);
    return {
      category_id: categoryId,
      ...fixedFilters(stats),
      attributes: detail.category.attributes.map((attribute) =>
        serializeAttribute(attribute, stats),
      ),
    };
  }
}
