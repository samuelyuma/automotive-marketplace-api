-- Name: 0002_soft_delete.down
-- Description: Reverts soft deletes after checking that no removed or edited data would be lost.

-- Stop the rollback if it would discard a removed listing or changed attribute.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM vehicle_listings WHERE status = 'REMOVED') THEN
    RAISE EXCEPTION 'Cannot revert soft-delete migration while removed listings exist';
  END IF;
  IF EXISTS (SELECT 1 FROM attribute_definitions WHERE deleted_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Cannot revert soft-delete migration while removed attributes exist';
  END IF;
  IF EXISTS (SELECT 1 FROM attribute_definitions WHERE updated_at <> created_at) THEN
    RAISE EXCEPTION 'Cannot revert soft-delete migration while updated attributes exist';
  END IF;
END;
$$;

DROP INDEX attribute_definitions_active_category_key;

ALTER TABLE attribute_definitions
  ADD CONSTRAINT attribute_definitions_category_key UNIQUE (category_id, key),
  DROP COLUMN updated_at,
  DROP COLUMN deleted_at;

ALTER TYPE listing_statuses RENAME TO listing_statuses_with_removed;
CREATE TYPE listing_statuses AS ENUM ('AVAILABLE', 'PENDING', 'SOLD');

ALTER TABLE vehicle_listings
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE listing_statuses USING status::text::listing_statuses,
  ALTER COLUMN status SET DEFAULT 'AVAILABLE';

DROP TYPE listing_statuses_with_removed;
