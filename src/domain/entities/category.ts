export type Category = {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  created_at: Date;
  updated_at: Date;
};

export type CategoryAttributeType = "ENUM" | "RANGE" | "BOOLEAN";

export type NewCategoryAttribute = {
  key: string;
  label: string;
  type: CategoryAttributeType;
  options?: string[] | null;
};

export type CategoryAttribute = {
  id: string;
  category_id: string;
  key: string;
  label: string;
  type: CategoryAttributeType;
  options: string[] | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

export type CategoryWithAttributes = Category & {
  attributes: CategoryAttribute[];
};

export type DeletedCategoryAttribute = {
  id: string;
  deleted_at: Date;
};

export type UpdatedCategoryWithAttributes = CategoryWithAttributes & {
  deleted_attributes: DeletedCategoryAttribute[];
};

export type NewCategory = Omit<Category, "id" | "created_at" | "updated_at"> & {
  attributes?: NewCategoryAttribute[];
};

export type UpdateCategory = Partial<NewCategory>;
