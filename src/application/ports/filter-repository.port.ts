export type FilterCount = { value: string; count: number };
export type FilterRange = { min: number | null; max: number | null };
export type AttributeFilterStats = {
  counts?: FilterCount[];
  range?: FilterRange;
  true_count?: number;
  false_count?: number;
};

export type FilterStats = {
  condition: FilterCount[];
  fuel_type: FilterCount[];
  transmission: FilterCount[];
  price: FilterRange;
  year: FilterRange;
  mileage: FilterRange;
  engine_cc: FilterRange;
  attributes: Record<string, AttributeFilterStats>;
};

export interface FilterRepository {
  getGlobal(): Promise<FilterStats>;
  getForCategory(categoryId: string): Promise<FilterStats>;
}
