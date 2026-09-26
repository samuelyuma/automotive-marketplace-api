-- Name: 0005_listing_attribute_values.up
-- Description: Stores typed listing attribute values and indexes them for detail reads and filter counts.

CREATE TABLE listing_attribute_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES vehicle_listings (id) ON DELETE CASCADE,
  attribute_definition_id uuid NOT NULL REFERENCES attribute_definitions (id) ON DELETE CASCADE,

  value_text text,
  value_number numeric,
  value_bool boolean,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT listing_attribute_values_listing_attribute_unique
    UNIQUE (listing_id, attribute_definition_id),

  -- One column must be set; the application checks which one matches the definition.
  CONSTRAINT listing_attribute_values_one_value CHECK (
    (num_nonnulls(value_text, value_number, value_bool) = 1)
  )
);

-- Loads all values for one listing.
CREATE INDEX idx_listing_attribute_values_listing
  ON listing_attribute_values (listing_id);

-- Groups text values for ENUM counts.
CREATE INDEX idx_listing_attribute_values_attr_text
  ON listing_attribute_values (attribute_definition_id, value_text)
  WHERE value_text IS NOT NULL;

-- Groups true and false values for BOOLEAN counts.
CREATE INDEX idx_listing_attribute_values_attr_bool
  ON listing_attribute_values (attribute_definition_id, value_bool)
  WHERE value_bool IS NOT NULL;

-- Finds numeric bounds for RANGE attributes.
CREATE INDEX idx_listing_attribute_values_attr_number
  ON listing_attribute_values (attribute_definition_id, value_number)
  WHERE value_number IS NOT NULL;
