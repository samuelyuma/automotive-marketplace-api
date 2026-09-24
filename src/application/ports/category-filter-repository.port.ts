export type FilterCount = { value: string; count: number };
export type FilterRange = { min: number | null; max: number | null };

export type CategoryFilterStats = {
  condition: FilterCount[];
  fuel_type: FilterCount[];
  transmission: FilterCount[];
  price: FilterRange;
  year: FilterRange;
  mileage: FilterRange;
  engine_cc: FilterRange;
};

export interface CategoryFilterRepository {
  getForCategory(categoryId: string): Promise<CategoryFilterStats>;
}
