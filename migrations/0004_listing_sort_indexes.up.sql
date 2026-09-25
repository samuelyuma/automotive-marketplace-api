CREATE INDEX idx_listings_price_id
  ON vehicle_listings (status, price, id);

CREATE INDEX idx_listings_year_id
  ON vehicle_listings (status, year, id);

CREATE INDEX idx_listings_mileage_id
  ON vehicle_listings (status, mileage, id);
