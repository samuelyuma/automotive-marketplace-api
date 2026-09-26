-- Name: 0001_init.up
-- Description: Creates the category, listing, and attribute tables with their enum types and indexes.

CREATE TYPE listing_conditions AS ENUM ('NEW', 'USED', 'CERTIFIED');
CREATE TYPE listing_statuses AS ENUM ('AVAILABLE', 'PENDING', 'SOLD');
CREATE TYPE fuel_types AS ENUM ('PETROL', 'DIESEL', 'HYBRID', 'ELECTRIC');
CREATE TYPE transmissions AS ENUM ('MANUAL', 'AUTOMATIC');
CREATE TYPE attribute_types AS ENUM ('ENUM', 'RANGE', 'BOOLEAN');

CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES categories (id),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT categories_not_self_parent CHECK (parent_id <> id)
);

CREATE INDEX idx_categories_parent ON categories (parent_id);

CREATE TABLE vehicle_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories (id),

  make text NOT NULL,
  model text NOT NULL,
  year smallint NOT NULL,
  price bigint NOT NULL,
  mileage integer NOT NULL,
  condition listing_conditions NOT NULL,
  color text NOT NULL,
  location text NOT NULL,
  status listing_statuses NOT NULL DEFAULT 'AVAILABLE',
  image_url text,

  fuel_type fuel_types,
  transmission transmissions,
  engine_cc integer,

  -- Keep text search in sync with the fields used by listing search.
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple', make || ' ' || model || ' ' || location)
  ) STORED,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT listings_year_range CHECK (year BETWEEN 1900 AND 2100),
  CONSTRAINT listings_price_nonneg CHECK (price >= 0),
  CONSTRAINT listings_mileage_nonneg CHECK (mileage >= 0)
);

CREATE INDEX idx_listings_search ON vehicle_listings USING GIN (search_vector);
CREATE INDEX idx_listings_category ON vehicle_listings (category_id);
CREATE INDEX idx_listings_filter ON vehicle_listings (status, make, year, price);
CREATE INDEX idx_listings_mileage ON vehicle_listings (mileage);
CREATE INDEX idx_listings_fuel ON vehicle_listings (category_id, fuel_type);
CREATE INDEX idx_listings_created ON vehicle_listings (created_at DESC, id DESC);

CREATE TABLE attribute_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories (id),
  key text NOT NULL,
  label text NOT NULL,
  type attribute_types NOT NULL,
  options text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attribute_definitions_category_key UNIQUE (category_id, key)
);
