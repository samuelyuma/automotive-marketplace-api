export type FilterCount = { value: string; count: number };
export type FilterRange = { min: number | null; max: number | null };

export type FilterStats = {
  condition: FilterCount[];
  fuel_type: FilterCount[];
  transmission: FilterCount[];
  price: FilterRange;
  year: FilterRange;
  mileage: FilterRange;
  engine_cc: FilterRange;
};

export interface FilterRepository {
  getGlobal(): Promise<FilterStats>;
  getForCategory(categoryId: string): Promise<FilterStats>;
}
