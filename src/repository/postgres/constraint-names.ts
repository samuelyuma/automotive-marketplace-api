export const CONSTRAINTS = {
  listingCategoryFk: "vehicle_listings_category_id_fkey",
  categorySlugUnique: "categories_slug_key",
  categoryAttributeKeyUnique: "attribute_definitions_category_key",
  categoryAttributeActiveKeyUnique: "attribute_definitions_active_category_key",
  categoryParentFk: "categories_parent_id_fkey",
  categoryNotSelfParent: "categories_not_self_parent",
} as const;
