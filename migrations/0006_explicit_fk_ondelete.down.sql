-- Name: 0006_explicit_fk_ondelete.down
-- Description: Restores PostgreSQL's default delete behavior on the category foreign keys.

ALTER TABLE attribute_definitions
  DROP CONSTRAINT attribute_definitions_category_id_fkey,
  ADD CONSTRAINT attribute_definitions_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES categories (id);

ALTER TABLE vehicle_listings
  DROP CONSTRAINT vehicle_listings_category_id_fkey,
  ADD CONSTRAINT vehicle_listings_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES categories (id);

ALTER TABLE categories
  DROP CONSTRAINT categories_parent_id_fkey,
  ADD CONSTRAINT categories_parent_id_fkey
    FOREIGN KEY (parent_id) REFERENCES categories (id);
