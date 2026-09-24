ALTER TYPE listing_statuses ADD VALUE 'REMOVED';

ALTER TABLE attribute_definitions
  ADD COLUMN updated_at timestamptz,
  ADD COLUMN deleted_at timestamptz;

UPDATE attribute_definitions SET updated_at = created_at;

ALTER TABLE attribute_definitions
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL,
  DROP CONSTRAINT attribute_definitions_category_key;

CREATE UNIQUE INDEX attribute_definitions_active_category_key
  ON attribute_definitions (category_id, key)
  WHERE deleted_at IS NULL;
