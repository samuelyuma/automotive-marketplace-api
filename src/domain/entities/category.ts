export type Category = {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  created_at: Date;
  updated_at: Date;
};

export type NewCategory = Omit<Category, "id" | "created_at" | "updated_at">;

export type UpdateCategory = Partial<NewCategory>;
