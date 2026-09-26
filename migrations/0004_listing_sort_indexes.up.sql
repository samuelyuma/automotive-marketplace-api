-- Name: 0004_listing_sort_indexes.up
-- Description: Adds indexes for price, year, and mileage sorting with listing ID to break ties.

CREATE INDEX idx_listings_price_id
  ON vehicle_listings (status, price, id);

CREATE INDEX idx_listings_year_id
  ON vehicle_listings (status, year, id);

CREATE INDEX idx_listings_mileage_id
  ON vehicle_listings (status, mileage, id);
