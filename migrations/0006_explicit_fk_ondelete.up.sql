-- Name: 0006_explicit_fk_ondelete.up
-- Description: Restricts deletion of categories with children or listings and cascades owned definitions.

-- Keep category subtrees from disappearing with a parent delete.
ALTER TABLE categories
  DROP CONSTRAINT categories_parent_id_fkey,
  ADD CONSTRAINT categories_parent_id_fkey
    FOREIGN KEY (parent_id) REFERENCES categories (id) ON DELETE RESTRICT;

-- A category with listings must be emptied before deletion.
ALTER TABLE vehicle_listings
  DROP CONSTRAINT vehicle_listings_category_id_fkey,
  ADD CONSTRAINT vehicle_listings_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT;

-- Definitions belong to the category and follow its deletion.
ALTER TABLE attribute_definitions
  DROP CONSTRAINT attribute_definitions_category_id_fkey,
  ADD CONSTRAINT attribute_definitions_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE;
